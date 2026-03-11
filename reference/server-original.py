"""
YTDownload - YouTube動画ダウンロードサーバー
Mac ARM (Apple Silicon) 対応 — MP4メタデータ書き込み版

依存関係:
  pip3 install fastapi uvicorn yt-dlp aiofiles httpx psutil mutagen

ffmpeg:
  brew install ffmpeg

起動:
  python3 server.py  →  http://localhost:8765
"""

import asyncio, json, logging, os, re, shutil, subprocess, tempfile, uuid
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

import aiofiles, httpx, yt_dlp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ── 設定 ──────────────────────────────────────────────────────────────────────
SAVE_DIR        = Path.home() / "Downloads" / "YouTube"
FFMPEG_PATH     = "ffmpeg"
FFPROBE_PATH    = "ffprobe"
DISCORD_WEBHOOK = os.environ.get("DISCORD_WEBHOOK", "")
MAX_CONCURRENT  = 2
LOG_FILE        = Path("ytdownload.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()],
)
log = logging.getLogger("ytdl")


# ── メタデータ構造 ─────────────────────────────────────────────────────────────
class MetaFields(BaseModel):
    """MP4に書き込むメタデータフィールド"""
    title:        Optional[str] = None   # 動画タイトル
    artist:       Optional[str] = None   # チャンネル名 (artist タグ)
    album_artist: Optional[str] = None   # チャンネル名 (album_artist タグ)
    album:        Optional[str] = None   # プレイリスト名 or チャンネル名
    date:         Optional[str] = None   # アップロード日 (YYYYMMDD or YYYY)
    comment:      Optional[str] = None   # 説明文
    description:  Optional[str] = None   # 詳細説明
    genre:        Optional[str] = None   # ジャンル（例: "YouTube"）
    track:        Optional[str] = None   # プレイリスト内の番号 "1/12"
    url:          Optional[str] = None   # 元のURL (comment に埋め込む用途)
    thumbnail_url:Optional[str] = None   # サムネイルURL（カバーアート埋め込みに使用）


# ── モデル ────────────────────────────────────────────────────────────────────
class FormatEnum(str, Enum):
    p360  = "360p"
    p480  = "480p"
    p720  = "720p"
    p1080 = "1080p"
    mp3   = "mp3"
    m4a   = "m4a"

class DLStatus(str, Enum):
    pending     = "pending"
    downloading = "downloading"
    converting  = "converting"
    tagging     = "tagging"     # ← メタデータ書き込み中
    done        = "done"
    error       = "error"
    paused      = "paused"

class DLRequest(BaseModel):
    url:          str
    format:       FormatEnum    = FormatEnum.p1080
    pl_start:     Optional[int] = None
    pl_end:       Optional[int] = None
    embed_meta:   bool          = True   # メタデータ埋め込みON/OFF
    embed_thumb:  bool          = True   # サムネイルをカバーアートとして埋め込む

class MetaWriteRequest(BaseModel):
    """既存ファイルへの手動メタデータ書き込みリクエスト"""
    path:   str
    fields: MetaFields

class DLTask:
    def __init__(self, req: DLRequest):
        self.id           = str(uuid.uuid4())[:8]
        self.url          = req.url
        self.format       = req.format
        self.pl_start     = req.pl_start
        self.pl_end       = req.pl_end
        self.embed_meta   = req.embed_meta
        self.embed_thumb  = req.embed_thumb
        self.title        = "取得中..."
        self.channel      = "—"
        self.episode      = "単話"
        self.thumbnail    = ""
        self.upload_date  = ""
        self.description  = ""
        self.status       = DLStatus.pending
        self.progress     = 0.0
        self.speed        = "—"
        self.eta          = "—"
        self.size         = "—"
        self.error_msg    = ""
        self.created      = datetime.now().isoformat()
        self.output       = ""          # 完成ファイルのフルパス
        self.meta_written = False       # メタデータ書き込み済みフラグ

    def to_dict(self):
        return self.__dict__


# ── キュー管理 ────────────────────────────────────────────────────────────────
tasks: dict[str, DLTask] = {}
sem   = asyncio.Semaphore(MAX_CONCURRENT)
wss:  list[WebSocket] = []

async def bcast(data: dict):
    dead = []
    for ws in wss:
        try:   await ws.send_json(data)
        except: dead.append(ws)
    for d in dead: wss.remove(d)


# ── yt-dlp フォーマット設定 ───────────────────────────────────────────────────
def get_ydl_format(fmt: FormatEnum) -> str:
    return {
        FormatEnum.p360:  "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]",
        FormatEnum.p480:  "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]",
        FormatEnum.p720:  "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]",
        FormatEnum.p1080: "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]",
        FormatEnum.mp3:   "bestaudio/best",
        FormatEnum.m4a:   "bestaudio[ext=m4a]/bestaudio/best",
    }.get(fmt, "bestvideo+bestaudio/best")

def get_postprocessors(fmt: FormatEnum, embed_meta: bool, embed_thumb: bool) -> list:
    pp = []
    if fmt == FormatEnum.mp3:
        pp.append({"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"})
    elif fmt == FormatEnum.m4a:
        pp.append({"key": "FFmpegExtractAudio", "preferredcodec": "m4a"})

    # yt-dlp 組み込みのメタデータ書き込み（基本タグ）
    if embed_meta:
        pp.append({"key": "FFmpegMetadata", "add_metadata": True})

    # サムネイルをカバーアート（mp4/m4a: covr タグ）として埋め込む
    if embed_thumb and fmt not in (FormatEnum.mp3,):
        pp.append({"key": "EmbedThumbnail"})

    return pp

def make_output_tmpl(task: DLTask) -> str:
    safe_ch = re.sub(r'[\\/*?:"<>|]', "_", task.channel or "Unknown")
    out_dir = SAVE_DIR / safe_ch
    out_dir.mkdir(parents=True, exist_ok=True)
    q = task.format
    if task.pl_start is not None or task.pl_end is not None:
        return str(out_dir / f"%(playlist_index)02d_%(title)s [{q}].%(ext)s")
    return str(out_dir / f"%(title)s [{q}].%(ext)s")


# ── ffmpeg で追加メタデータを書き込む ─────────────────────────────────────────
def write_mp4_metadata(file_path: Path, meta: MetaFields) -> Path:
    """
    ffmpeg を使って MP4/M4A ファイルのメタデータタグを書き込む。
    入力ファイルを tmp にコピーして処理し、元のパスに上書きする。

    書き込まれるタグ（MP4 atom）:
      ©nam  = title          … 動画タイトル
      ©ART  = artist         … チャンネル名
      aART  = album_artist   … チャンネル名（一覧表示用）
      ©alb  = album          … プレイリスト or チャンネル名
      ©day  = date           … アップロード日
      ©cmt  = comment        … URL + 説明文
      ©gen  = genre          … "YouTube"
      trkn  = track          … プレイリスト番号
      desc  = description    … 概要欄テキスト
    """
    suffix = file_path.suffix.lower()
    if suffix not in (".mp4", ".m4a", ".mov"):
        log.warning(f"メタデータ書き込みは mp4/m4a のみ対応: {file_path.name}")
        return file_path

    tmp = file_path.with_suffix(".tmp" + suffix)

    cmd = [FFMPEG_PATH, "-y", "-i", str(file_path), "-c", "copy"]

    def add(tag, value):
        if value:
            cmd += ["-metadata", f"{tag}={value}"]

    add("title",        meta.title)
    add("artist",       meta.artist)
    add("album_artist", meta.album_artist or meta.artist)
    add("album",        meta.album        or meta.artist)
    add("date",         meta.date)
    add("genre",        meta.genre        or "YouTube")
    add("track",        meta.track)
    add("description",  meta.description)

    # comment に URL と説明を両方入れる
    cmt_parts = []
    if meta.url:
        cmt_parts.append(meta.url)
    if meta.comment:
        cmt_parts.append(meta.comment)
    if cmt_parts:
        add("comment", "\n".join(cmt_parts))

    cmd.append(str(tmp))

    log.info(f"[meta] ffmpeg実行: {' '.join(cmd[-6:])}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        log.error(f"[meta] ffmpegエラー: {result.stderr[-400:]}")
        if tmp.exists():
            tmp.unlink()
        raise RuntimeError(f"ffmpeg メタデータ書き込み失敗: {result.stderr[-200:]}")

    # 元ファイルを上書き
    shutil.move(str(tmp), str(file_path))
    log.info(f"[meta] 書き込み完了: {file_path.name}")
    return file_path


# ── ffprobe でメタデータを読み取る ─────────────────────────────────────────────
def read_mp4_metadata(file_path: Path) -> dict:
    """ffprobe で MP4 の既存メタデータを読み取る"""
    cmd = [
        FFPROBE_PATH, "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        str(file_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {}
    try:
        data = json.loads(result.stdout)
        return data.get("format", {}).get("tags", {})
    except Exception:
        return {}


# ── ダウンロード本体 ───────────────────────────────────────────────────────────
async def run_download(task: DLTask):
    async with sem:
        loop = asyncio.get_event_loop()
        try:
            task.status = DLStatus.downloading
            await bcast({"event": "progress", "task": task.to_dict()})
            log.info(f"[{task.id}] 開始: {task.url}")

            info_holder = {}  # スレッド間でメタデータを受け渡す

            def _prog_hook(d):
                if d["status"] == "downloading":
                    task.status = DLStatus.downloading
                    raw = d.get("_percent_str", "0%").strip().replace("%", "")
                    try:   task.progress = float(raw)
                    except: pass
                    task.speed = d.get("_speed_str", "—").strip()
                    task.eta   = d.get("_eta_str",   "—").strip()
                    total = d.get("total_bytes") or d.get("total_bytes_estimate")
                    if total:
                        task.size = f"{total/1024/1024:.0f} MB"
                elif d["status"] == "finished":
                    task.status   = DLStatus.converting
                    task.progress = 95.0
                    # 完成ファイルのパスを保存
                    if "filename" in d:
                        info_holder["output"] = d["filename"]
                asyncio.run_coroutine_threadsafe(
                    bcast({"event": "progress", "task": task.to_dict()}), loop
                )

            ydl_opts = {
                "format":              get_ydl_format(task.format),
                "outtmpl":             make_output_tmpl(task),
                "merge_output_format": "mp4",
                "ffmpeg_location":     FFMPEG_PATH,
                "postprocessors":      get_postprocessors(
                                           task.format,
                                           task.embed_meta,
                                           task.embed_thumb
                                       ),
                "noplaylist":          (task.pl_start is None and task.pl_end is None),
                "playliststart":       task.pl_start or 1,
                "playlistend":         task.pl_end,
                "progress_hooks":      [_prog_hook],
                "writethumbnail":      task.embed_thumb,   # サムネイルを一時保存
                "quiet":               True,
                "no_warnings":         True,
            }

            def _run():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    raw_info = ydl.extract_info(task.url, download=True)
                    if raw_info:
                        entry = (raw_info.get("entries") or [raw_info])[0]
                        task.title       = raw_info.get("title")    or entry.get("title", "Unknown")
                        task.channel     = raw_info.get("uploader") or entry.get("uploader", "Unknown")
                        task.thumbnail   = entry.get("thumbnail", "")
                        task.upload_date = entry.get("upload_date", "")
                        task.description = (entry.get("description") or "")[:500]
                        if "entries" in raw_info:
                            task.episode = f"プレイリスト {len(raw_info['entries'])}本"
                        info_holder["info"] = raw_info
                        info_holder["entry"] = entry

            await loop.run_in_executor(None, _run)

            # ── メタデータ追加書き込みフェーズ ────────────────────────────────
            if task.embed_meta and task.format not in (FormatEnum.mp3,):
                task.status   = DLStatus.tagging
                task.progress = 97.0
                await bcast({"event": "progress", "task": task.to_dict()})

                # 保存されたファイルを探す
                entry  = info_holder.get("entry", {})
                safe_ch = re.sub(r'[\\/*?:"<>|]', "_", task.channel or "Unknown")
                out_dir = SAVE_DIR / safe_ch

                # yt-dlp が出力したファイルを特定（タイトルで検索）
                safe_title = re.sub(r'[\\/*?:"<>|]', "_", task.title)
                candidates = list(out_dir.glob(f"*{task.format}*.mp4")) + \
                             list(out_dir.glob(f"*{task.format}*.m4a"))

                for fpath in candidates:
                    meta = MetaFields(
                        title        = task.title,
                        artist       = task.channel,
                        album_artist = task.channel,
                        album        = task.channel,
                        date         = task.upload_date,          # YYYYMMDD
                        genre        = "YouTube",
                        description  = task.description,
                        url          = task.url,
                        comment      = f"Source: {task.url}",
                    )
                    try:
                        def _write_meta(p=fpath, m=meta):
                            write_mp4_metadata(p, m)
                        await loop.run_in_executor(None, _write_meta)
                        task.meta_written = True
                        task.output       = str(fpath)
                        log.info(f"[{task.id}] メタデータ書き込み完了: {fpath.name}")
                    except Exception as e:
                        log.error(f"[{task.id}] メタデータ書き込み失敗: {e}")

            task.status   = DLStatus.done
            task.progress = 100.0
            await bcast({"event": "progress", "task": task.to_dict()})
            log.info(f"[{task.id}] 完了: {task.title}")
            await notify_discord(task)

        except Exception as e:
            task.status    = DLStatus.error
            task.error_msg = str(e)
            await bcast({"event": "progress", "task": task.to_dict()})
            log.error(f"[{task.id}] エラー: {e}")


# ── Discord通知 ────────────────────────────────────────────────────────────────
async def notify_discord(task: DLTask):
    if not DISCORD_WEBHOOK:
        return
    try:
        async with httpx.AsyncClient() as c:
            await c.post(DISCORD_WEBHOOK, json={"embeds": [{
                "title": "✅ ダウンロード完了",
                "description": f"**{task.title}**",
                "color": 0xFF0000,
                "fields": [
                    {"name": "チャンネル",     "value": task.channel,       "inline": True},
                    {"name": "フォーマット",   "value": task.format,        "inline": True},
                    {"name": "サイズ",         "value": task.size,          "inline": True},
                    {"name": "メタデータ",     "value": "✓ 書き込み済み" if task.meta_written else "—", "inline": True},
                ],
                "timestamp": datetime.utcnow().isoformat(),
            }]}, timeout=5)
    except Exception as e:
        log.warning(f"Discord通知失敗: {e}")


# ── FastAPI ────────────────────────────────────────────────────────────────────
app = FastAPI(title="YTDownload", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ダウンロード開始
@app.post("/api/download")
async def add_download(req: DLRequest, bg: BackgroundTasks):
    task = DLTask(req)
    tasks[task.id] = task
    bg.add_task(run_download, task)
    return task.to_dict()

# キュー一覧
@app.get("/api/queue")
async def get_queue():
    return [t.to_dict() for t in reversed(list(tasks.values()))]

# タスク削除
@app.delete("/api/queue/{tid}")
async def del_task(tid: str):
    if tid not in tasks: raise HTTPException(404)
    del tasks[tid]
    return {"ok": True}

# ── メタデータ関連 API ─────────────────────────────────────────────────────────

@app.get("/api/metadata")
async def get_metadata(path: str):
    """
    指定した MP4 ファイルの現在のメタデータタグを返す。
    ffprobe で読み取る。
    """
    p = Path(path)
    if not p.exists() or not str(p).startswith(str(SAVE_DIR)):
        raise HTTPException(403, "アクセス不可")
    loop = asyncio.get_event_loop()
    tags = await loop.run_in_executor(None, read_mp4_metadata, p)
    return {"path": str(p), "tags": tags}

@app.post("/api/metadata")
async def post_metadata(req: MetaWriteRequest):
    """
    指定した MP4/M4A ファイルにメタデータを書き込む。
    ファイルは上書きされる（バックアップなし）。
    """
    p = Path(req.path)
    if not p.exists() or not str(p).startswith(str(SAVE_DIR)):
        raise HTTPException(403, "アクセス不可")
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, write_mp4_metadata, p, req.fields)
        return {"ok": True, "path": str(p)}
    except RuntimeError as e:
        raise HTTPException(500, str(e))

@app.get("/api/metadata/batch")
async def batch_get_metadata(folder: str):
    """
    フォルダ内の全 MP4/M4A のメタデータをまとめて返す。
    """
    d = SAVE_DIR / folder
    if not d.is_dir(): raise HTTPException(404)
    loop = asyncio.get_event_loop()
    result = []
    for f in sorted(d.glob("*.mp4")):
        tags = await loop.run_in_executor(None, read_mp4_metadata, f)
        result.append({"file": f.name, "path": str(f), "tags": tags})
    for f in sorted(d.glob("*.m4a")):
        tags = await loop.run_in_executor(None, read_mp4_metadata, f)
        result.append({"file": f.name, "path": str(f), "tags": tags})
    return result

@app.post("/api/metadata/batch")
async def batch_write_metadata(folder: str, fields: MetaFields, bg: BackgroundTasks):
    """
    フォルダ内の全 MP4/M4A に同じメタデータフィールドを一括書き込み。
    （album / artist 等の共通タグを後から補完する用途）
    """
    d = SAVE_DIR / folder
    if not d.is_dir(): raise HTTPException(404)
    files = list(d.glob("*.mp4")) + list(d.glob("*.m4a"))

    async def _run_all():
        loop = asyncio.get_event_loop()
        for f in files:
            try:
                await loop.run_in_executor(None, write_mp4_metadata, f, fields)
                log.info(f"[batch-meta] {f.name} 完了")
            except Exception as e:
                log.error(f"[batch-meta] {f.name} 失敗: {e}")

    bg.add_task(_run_all)
    return {"ok": True, "queued": len(files)}

# ── ファイル管理 API ───────────────────────────────────────────────────────────
@app.get("/api/files")
async def list_files():
    result = []
    if SAVE_DIR.exists():
        for ext in ("*.mp4", "*.mp3", "*.m4a"):
            for f in sorted(SAVE_DIR.rglob(ext), key=lambda x: x.stat().st_mtime, reverse=True):
                s = f.stat()
                result.append({
                    "name":    f.name,
                    "path":    str(f),
                    "dir":     f.parent.name,
                    "ext":     f.suffix.lstrip("."),
                    "size_mb": round(s.st_size / 1024 / 1024, 1),
                    "date":    datetime.fromtimestamp(s.st_mtime).strftime("%Y-%m-%d"),
                })
    return sorted(result, key=lambda x: x["date"], reverse=True)

@app.delete("/api/files")
async def delete_file(path: str):
    p = Path(path)
    if not p.exists() or not str(p).startswith(str(SAVE_DIR)):
        raise HTTPException(403)
    p.unlink()
    return {"ok": True}

@app.get("/api/stream/{file_path:path}")
async def stream(file_path: str):
    p = SAVE_DIR / file_path
    if not p.exists(): raise HTTPException(404)
    return FileResponse(str(p), media_type="video/mp4")

@app.get("/api/info")
async def get_info(url: str):
    def _fetch():
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
            return ydl.extract_info(url, download=False)
    loop = asyncio.get_event_loop()
    try:
        info = await loop.run_in_executor(None, _fetch)
        return {
            "title":       info.get("title"),
            "channel":     info.get("uploader"),
            "duration":    info.get("duration"),
            "upload_date": info.get("upload_date"),
            "description": (info.get("description") or "")[:300],
            "thumbnail":   info.get("thumbnail"),
            "is_playlist": "entries" in info,
            "count":       len(info.get("entries", [])) if "entries" in info else 1,
        }
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/api/status")
async def status():
    import psutil
    return {
        "cpu":          psutil.cpu_percent(interval=0.1),
        "mem":          psutil.virtual_memory().percent,
        "active_tasks": sum(1 for t in tasks.values() if t.status in [DLStatus.downloading, DLStatus.converting, DLStatus.tagging]),
        "save_dir":     str(SAVE_DIR),
    }

@app.get("/api/logs")
async def get_logs(lines: int = 100):
    if not LOG_FILE.exists(): return []
    async with aiofiles.open(LOG_FILE) as f:
        content = await f.read()
    return content.strip().splitlines()[-lines:]

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    wss.append(ws)
    try:
        await ws.send_json({"event": "init", "tasks": [t.to_dict() for t in tasks.values()]})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        if ws in wss: wss.remove(ws)

if __name__ == "__main__":
    import uvicorn
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    log.info(f"保存先: {SAVE_DIR}")
    log.info("起動: http://localhost:8765")
    uvicorn.run(app, host="0.0.0.0", port=8765, reload=False)
