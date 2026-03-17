/**
 * AnimeVault Server  (port 4040)
 * ─────────────────────────────────────────────────────────────────
 * GET  /health                     ヘルスチェック
 * GET  /api/files                  ファイル一覧
 * DELETE /api/files/:filename      ファイル削除
 * GET  /api/download/:filename     ファイル個別DL (Rangeサポート)
 * POST /api/zip                    選択ファイルをZIP化してストリーム返却
 * GET  /api/queue                  キュー取得
 * POST /api/queue                  キューに追加
 * DELETE /api/queue/:id            キューから削除
 * POST /api/sftp/connect           SFTP接続テスト
 * POST /api/sftp/ls                SFTPディレクトリ一覧
 * POST /api/sftp/get               SFTPからローカルへコピー
 * POST /api/sftp/put               ローカルからSFTPへ転送
 * GET  /api/sysinfo                CPU/Disk情報
 * POST /api/meta/write             ffmpegでmp4メタデータ書き込み
 */

require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const morgan   = require("morgan");
const path     = require("path");
const fs       = require("fs");
const fsp      = require("fs/promises");
const archiver = require("archiver");
const { v4: uuidv4 } = require("uuid");
const { exec } = require("child_process");
const SftpClient = require("ssh2-sftp-client");

const app = express();
const PORT      = process.env.ANIMEVAULT_PORT || 4040;
const ANIME_DIR = process.env.ANIME_DIR || path.join(__dirname, "../data/anime");

// ─ Ensure ANIME_DIR exists ─
fs.mkdirSync(ANIME_DIR, { recursive: true });

// ─ In-memory queue ─
let queue = [];

// ─ Middleware ─
app.use(cors({ origin: "*", methods: ["GET","POST","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Range"] }));
app.use(express.json());
app.use(morgan("dev"));

// ─ Serve React build ─
const CLIENT_BUILD = path.join(__dirname, "../client/dist");
if (fs.existsSync(CLIENT_BUILD)) {
  app.use(express.static(CLIENT_BUILD));
}

// ══════════════════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════════════════
app.get("/health", (req, res) => {
  res.json({ ok: true, version: "1.0.0", time: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════
//  FILES
// ══════════════════════════════════════════════════════
app.get("/api/files", async (req, res) => {
  try {
    const entries = await fsp.readdir(ANIME_DIR, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // フォルダ内のmp4も走査
        const sub = path.join(ANIME_DIR, entry.name);
        const subEntries = await fsp.readdir(sub, { withFileTypes: true });
        for (const s of subEntries) {
          if (s.isFile() && s.name.endsWith(".mp4")) {
            const stat = await fsp.stat(path.join(sub, s.name));
            files.push(parseFileEntry(s.name, stat, entry.name));
          }
        }
      } else if (entry.isFile() && entry.name.endsWith(".mp4")) {
        const stat = await fsp.stat(path.join(ANIME_DIR, entry.name));
        files.push(parseFileEntry(entry.name, stat, null));
      }
    }

    res.json({ ok: true, files });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function parseFileEntry(filename, stat, folder) {
  // ファイル名から series/ep を推定
  // 例: "進撃の巨人 Ep01 [1080p].mp4" or "Hirogaru Sky Precure - E16.mp4"
  const epMatch   = filename.match(/[-\s]E[Pp]?(\d+)/i);
  const qualMatch = filename.match(/\[(\d+p)\]/);
  const series    = folder || filename.replace(/\s*[-\s]E[Pp]?\d+.*$/i, "").replace(/\.mp4$/i,"").trim();

  const sizeMB = stat.size / 1024 / 1024;
  const size   = sizeMB >= 1024
    ? `${(sizeMB / 1024).toFixed(2)}GB`
    : `${Math.round(sizeMB)}MB`;

  return {
    name:    filename,
    series,
    animeId: slugify(series),
    ep:      epMatch ? parseInt(epMatch[1]) : null,
    quality: qualMatch ? qualMatch[1] : "—",
    size,
    bytes:   stat.size,
    date:    stat.mtime.toISOString().slice(0, 10),
    path:    folder ? path.join(folder, filename) : filename,
  };
}

function slugify(str) {
  return str.toLowerCase().replace(/[^\w\u3040-\u30ff\u4e00-\u9faf]+/g, "-").replace(/(^-|-$)/g,"");
}

// ─ ファイル削除 ─
app.delete("/api/files/:filename", async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = path.join(ANIME_DIR, filename);
  // ディレクトリトラバーサル防止
  if (!filePath.startsWith(ANIME_DIR)) return res.status(400).json({ ok: false, error: "Invalid path" });
  try {
    await fsp.unlink(filePath);
    res.json({ ok: true });
  } catch (e) {
    // サブフォルダ内も探す
    try {
      const entries = await fsp.readdir(ANIME_DIR);
      for (const entry of entries) {
        const subPath = path.join(ANIME_DIR, entry, filename);
        if (fs.existsSync(subPath)) {
          await fsp.unlink(subPath);
          return res.json({ ok: true });
        }
      }
      res.status(404).json({ ok: false, error: "File not found" });
    } catch (e2) {
      res.status(500).json({ ok: false, error: e2.message });
    }
  }
});

// ══════════════════════════════════════════════════════
//  DOWNLOAD  (Rangeリクエスト対応)
// ══════════════════════════════════════════════════════
app.get("/api/download/:filename(*)", async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  let filePath = path.join(ANIME_DIR, filename);
  if (!filePath.startsWith(ANIME_DIR)) return res.status(400).end();

  // サブフォルダも探す
  if (!fs.existsSync(filePath)) {
    let found = false;
    try {
      const entries = await fsp.readdir(ANIME_DIR, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) {
          const sub = path.join(ANIME_DIR, e.name, filename);
          if (fs.existsSync(sub)) { filePath = sub; found = true; break; }
        }
      }
    } catch {}
    if (!found) return res.status(404).json({ ok: false, error: "File not found" });
  }

  const stat = await fsp.stat(filePath);
  const total = stat.size;
  const range = req.headers.range;

  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Accept-Ranges", "bytes");

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end   = endStr ? parseInt(endStr, 10) : total - 1;
    const chunkSize = end - start + 1;
    res.setHeader("Content-Range",  `bytes ${start}-${end}/${total}`);
    res.setHeader("Content-Length", chunkSize);
    res.status(206);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.setHeader("Content-Length", total);
    fs.createReadStream(filePath).pipe(res);
  }
});

// ══════════════════════════════════════════════════════
//  ZIP  ─ 選択ファイルをアーカイブしてストリーム返却
// ══════════════════════════════════════════════════════
app.post("/api/zip", async (req, res) => {
  const { files: fileNames = [], outputName = "AnimeVault.zip", folders = false } = req.body;

  // フォルダ単位も対応: folders=true の場合は全ファイル
  let targets = fileNames;
  if (folders || !fileNames.length) {
    // ANIME_DIR 直下 + サブフォルダ内の全mp4
    targets = await getAllMp4s(ANIME_DIR);
  }

  if (!targets.length) return res.status(400).json({ ok: false, error: "No files specified" });

  const safeOutput = path.basename(outputName) || "AnimeVault.zip";
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(safeOutput)}`);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Transfer-Encoding", "chunked");

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  archive.on("error", (err) => { console.error("archiver error:", err); res.end(); });

  for (const filename of targets) {
    let filePath = path.join(ANIME_DIR, filename);
    if (!fs.existsSync(filePath)) {
      // サブフォルダを探す
      const found = await findFile(ANIME_DIR, filename);
      if (found) filePath = found;
      else { console.warn("skip (not found):", filename); continue; }
    }
    // ZIP内パス: series/filename
    const relativeName = filePath.startsWith(ANIME_DIR)
      ? filePath.slice(ANIME_DIR.length + 1)
      : filename;
    archive.file(filePath, { name: relativeName });
  }

  await archive.finalize();
});

async function getAllMp4s(dir) {
  const results = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = await fsp.readdir(path.join(dir, e.name));
      sub.filter(f => f.endsWith(".mp4")).forEach(f => results.push(path.join(e.name, f)));
    } else if (e.isFile() && e.name.endsWith(".mp4")) {
      results.push(e.name);
    }
  }
  return results;
}

async function findFile(dir, filename) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(dir, e.name, filename);
      if (fs.existsSync(sub)) return sub;
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════
//  QUEUE
// ══════════════════════════════════════════════════════
app.get("/api/queue", (req, res) => {
  res.json({ ok: true, queue });
});

app.post("/api/queue", (req, res) => {
  const { title, ep, epNum, quality, animeId } = req.body;
  const item = {
    id: uuidv4(), title, ep, epNum, animeId, quality,
    progress: 0, speed: "—", eta: "—", status: "queued", size: "—"
  };
  queue.push(item);
  res.json({ ok: true, item });
});

app.delete("/api/queue/:id", (req, res) => {
  queue = queue.filter(q => q.id !== req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  SFTP
// ══════════════════════════════════════════════════════
app.post("/api/sftp/connect", async (req, res) => {
  const { host, port = 22, user, password, keyPath } = req.body;
  const sftp = new SftpClient();
  const connectOptions = { host, port: parseInt(port), username: user };
  if (password) connectOptions.password = password;
  if (keyPath && fs.existsSync(keyPath)) connectOptions.privateKey = fs.readFileSync(keyPath);

  try {
    await sftp.connect(connectOptions);
    await sftp.end();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.post("/api/sftp/ls", async (req, res) => {
  const { host, port = 22, user, password, keyPath, remotePath } = req.body;
  const sftp = new SftpClient();
  const connectOptions = { host, port: parseInt(port), username: user };
  if (password) connectOptions.password = password;
  if (keyPath && fs.existsSync(keyPath)) connectOptions.privateKey = fs.readFileSync(keyPath);

  try {
    await sftp.connect(connectOptions);
    const list = await sftp.list(remotePath || "/");
    await sftp.end();
    res.json({ ok: true, items: list.map(f => ({
      name: f.name, type: f.type === "d" ? "dir" : "file",
      size: f.size, mtime: f.modifyTime
    }))});
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// SFTPからローカルへコピー (サーバーサイドpull)
app.post("/api/sftp/get", async (req, res) => {
  const { host, port = 22, user, password, keyPath, remotePath, localFilename } = req.body;
  const sftp = new SftpClient();
  const connectOptions = { host, port: parseInt(port), username: user };
  if (password) connectOptions.password = password;
  if (keyPath && fs.existsSync(keyPath)) connectOptions.privateKey = fs.readFileSync(keyPath);

  const localPath = path.join(ANIME_DIR, path.basename(localFilename || remotePath));
  if (!localPath.startsWith(ANIME_DIR)) return res.status(400).json({ ok:false, error:"Invalid path" });

  try {
    await sftp.connect(connectOptions);
    await sftp.fastGet(remotePath, localPath);
    await sftp.end();
    res.json({ ok: true, localPath });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ローカルからSFTPへ転送
app.post("/api/sftp/put", async (req, res) => {
  const { host, port = 22, user, password, keyPath, localFilename, remotePath } = req.body;
  const sftp = new SftpClient();
  const connectOptions = { host, port: parseInt(port), username: user };
  if (password) connectOptions.password = password;
  if (keyPath && fs.existsSync(keyPath)) connectOptions.privateKey = fs.readFileSync(keyPath);

  // ファイルを探す
  let localPath = path.join(ANIME_DIR, localFilename);
  if (!fs.existsSync(localPath)) {
    const found = await findFile(ANIME_DIR, localFilename);
    if (found) localPath = found;
    else return res.status(404).json({ ok: false, error: "Local file not found" });
  }

  try {
    await sftp.connect(connectOptions);
    await sftp.fastPut(localPath, remotePath + "/" + path.basename(localFilename));
    await sftp.end();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ══════════════════════════════════════════════════════
//  SYSINFO
// ══════════════════════════════════════════════════════
app.get("/api/sysinfo", (req, res) => {
  const cpuUsage = process.cpuUsage();
  const memUsage = process.memoryUsage();

  exec("df -h " + ANIME_DIR + " | tail -1", (err, stdout) => {
    let disk = "—";
    if (!err && stdout) {
      const parts = stdout.trim().split(/\s+/);
      if (parts.length >= 4) disk = `${parts[3]} 空き / ${parts[1]} 合計`;
    }
    res.json({
      ok: true,
      cpu: `${Math.round(cpuUsage.user / 1000)}ms`,
      mem: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      disk,
      uptime: Math.round(process.uptime()) + "s",
    });
  });
});

// ══════════════════════════════════════════════════════
//  METADATA  ─ ffmpeg でmp4タグ書き込み
// ══════════════════════════════════════════════════════
app.post("/api/meta/write", async (req, res) => {
  const { filename, meta } = req.body;
  let filePath = path.join(ANIME_DIR, filename);
  if (!filePath.startsWith(ANIME_DIR)) return res.status(400).json({ ok:false, error:"Invalid path" });

  if (!fs.existsSync(filePath)) {
    const found = await findFile(ANIME_DIR, filename);
    if (found) filePath = found;
    else return res.status(404).json({ ok:false, error:"File not found" });
  }

  const tmpPath = filePath.replace(".mp4", `_meta_${Date.now()}.mp4`);
  const tags = Object.entries(meta)
    .filter(([,v]) => v)
    .map(([k,v]) => `-metadata ${k}="${v.toString().replace(/"/g,'\\"')}"`)
    .join(" ");

  const cmd = `ffmpeg -y -i "${filePath}" -c copy ${tags} -movflags +faststart "${tmpPath}"`;

  exec(cmd, async (err, stdout, stderr) => {
    if (err) return res.status(500).json({ ok:false, error: stderr.slice(-300) });
    try {
      await fsp.rename(tmpPath, filePath);
      res.json({ ok: true });
    } catch (e2) {
      res.status(500).json({ ok:false, error: e2.message });
    }
  });
});

// ══════════════════════════════════════════════════════
//  SPA fallback
// ══════════════════════════════════════════════════════
if (fs.existsSync(CLIENT_BUILD)) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(CLIENT_BUILD, "index.html"));
  });
}

// ══════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   AnimeVault Server                          ║
║   http://0.0.0.0:${PORT}                       ║
║   ANIME_DIR: ${ANIME_DIR}
╚══════════════════════════════════════════════╝
  `);
});
