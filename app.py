import os
import re
import uuid
import subprocess
import threading

from flask import Flask, Response, render_template, request, jsonify, send_from_directory
import yt_dlp
import requests as http_requests

app = Flask(__name__)

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
YOUTUBE_DIR = os.path.join(DOWNLOAD_DIR, 'youtube')
ANIME_DIR = os.path.join(DOWNLOAD_DIR, 'anime')
HIANIME_API = 'http://localhost:3030/api/v1'
YTDL_API = 'http://localhost:8765'
ANIMEVAULT_API = 'http://localhost:4040'

os.makedirs(YOUTUBE_DIR, exist_ok=True)
os.makedirs(ANIME_DIR, exist_ok=True)

# In-memory download progress tracking
download_tasks = {}


# ─── Frontend (React build) ──────────────────────────────────────────────────

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')


@app.route('/')
def index():
    # Serve React build if available, fallback to vanilla template
    react_index = os.path.join(FRONTEND_DIR, 'index.html')
    if os.path.exists(react_index):
        return send_from_directory(FRONTEND_DIR, 'index.html')
    return render_template('index.html')


@app.route('/assets/<path:filename>')
def serve_react_assets(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'assets'), filename)


# ─── YouTube ─────────────────────────────────────────────────────────────────

@app.route('/api/youtube/info')
def youtube_info():
    url = request.args.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL required'}), 400

    ydl_opts = {'quiet': True, 'no_warnings': True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        formats = []
        for f in info.get('formats', []):
            formats.append({
                'format_id': f.get('format_id'),
                'ext': f.get('ext'),
                'resolution': f.get('resolution', 'audio only'),
                'filesize': f.get('filesize') or f.get('filesize_approx'),
                'vcodec': f.get('vcodec'),
                'acodec': f.get('acodec'),
                'format_note': f.get('format_note', ''),
                'fps': f.get('fps'),
            })

        return jsonify({
            'title': info.get('title'),
            'thumbnail': info.get('thumbnail'),
            'duration': info.get('duration'),
            'uploader': info.get('uploader'),
            'formats': formats,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/youtube/download', methods=['POST'])
def youtube_download():
    data = request.json or {}
    url = data.get('url', '').strip()
    quality = data.get('quality', 'best')

    if not url:
        return jsonify({'error': 'URL required'}), 400

    task_id = str(uuid.uuid4())
    download_tasks[task_id] = {
        'status': 'starting',
        'progress': 0,
        'filename': None,
        'error': None,
    }

    thread = threading.Thread(target=_do_youtube_download, args=(task_id, url, quality))
    thread.daemon = True
    thread.start()

    return jsonify({'task_id': task_id})


def _do_youtube_download(task_id, url, quality):
    format_map = {
        'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '1080': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
        '720': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
        '480': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]',
        '360': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]',
        'audio': 'bestaudio[ext=m4a]/bestaudio',
    }

    def progress_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            pct = (downloaded / total * 100) if total > 0 else 0
            download_tasks[task_id]['status'] = 'downloading'
            download_tasks[task_id]['progress'] = round(pct, 1)
        elif d['status'] == 'finished':
            download_tasks[task_id]['status'] = 'processing'
            download_tasks[task_id]['progress'] = 100

    ydl_opts = {
        'format': format_map.get(quality, format_map['best']),
        'outtmpl': os.path.join(YOUTUBE_DIR, '%(title)s.%(ext)s'),
        'progress_hooks': [progress_hook],
        'quiet': True,
    }

    if quality == 'audio':
        ydl_opts['postprocessors'] = [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3'}]
    else:
        ydl_opts['merge_output_format'] = 'mp4'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url)
            filename = ydl.prepare_filename(info)
            if quality == 'audio':
                filename = os.path.splitext(filename)[0] + '.mp3'
            elif not filename.endswith('.mp4'):
                filename = os.path.splitext(filename)[0] + '.mp4'
        download_tasks[task_id]['status'] = 'complete'
        download_tasks[task_id]['filename'] = os.path.basename(filename)
    except Exception as e:
        download_tasks[task_id]['status'] = 'error'
        download_tasks[task_id]['error'] = str(e)


@app.route('/api/youtube/progress/<task_id>')
def youtube_progress(task_id):
    task = download_tasks.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task)


@app.route('/api/downloads/youtube/<filename>')
def serve_youtube_download(filename):
    return send_from_directory(YOUTUBE_DIR, filename, as_attachment=True)


# ─── Anime (proxy to hianime-API) ───────────────────────────────────────────

@app.route('/api/anime/search')
def anime_search():
    keyword = request.args.get('keyword', '')
    page = request.args.get('page', '1')
    try:
        resp = http_requests.get(f'{HIANIME_API}/search', params={'keyword': keyword, 'page': page}, timeout=10)
        return jsonify(resp.json())
    except http_requests.RequestException as e:
        return jsonify({'error': f'Anime API unavailable: {e}'}), 502


@app.route('/api/anime/info/<path:anime_id>')
def anime_info(anime_id):
    try:
        resp = http_requests.get(f'{HIANIME_API}/anime/{anime_id}', timeout=10)
        return jsonify(resp.json())
    except http_requests.RequestException as e:
        return jsonify({'error': f'Anime API unavailable: {e}'}), 502


@app.route('/api/anime/episodes/<path:anime_id>')
def anime_episodes(anime_id):
    try:
        resp = http_requests.get(f'{HIANIME_API}/episodes/{anime_id}', timeout=10)
        return jsonify(resp.json())
    except http_requests.RequestException as e:
        return jsonify({'error': f'Anime API unavailable: {e}'}), 502


@app.route('/api/anime/servers/<path:episode_id>')
def anime_servers(episode_id):
    try:
        resp = http_requests.get(f'{HIANIME_API}/servers/{episode_id}', timeout=10)
        return jsonify(resp.json())
    except http_requests.RequestException as e:
        return jsonify({'error': f'Anime API unavailable: {e}'}), 502


@app.route('/api/anime/stream')
def anime_stream():
    ep_id = request.args.get('id', '')
    server = request.args.get('server', 'hd-1')
    stream_type = request.args.get('type', 'sub')
    try:
        resp = http_requests.get(
            f'{HIANIME_API}/stream',
            params={'id': ep_id, 'server': server, 'type': stream_type},
            timeout=15,
        )
        return jsonify(resp.json())
    except http_requests.RequestException as e:
        return jsonify({'error': f'Anime API unavailable: {e}'}), 502


@app.route('/api/anime/download', methods=['POST'])
def anime_download():
    data = request.json or {}
    hls_url = data.get('url', '').strip()
    filename = data.get('filename', 'anime_episode')
    referer = data.get('referer', 'https://megacloud.tv')

    if not hls_url:
        return jsonify({'error': 'HLS URL required'}), 400

    task_id = str(uuid.uuid4())
    download_tasks[task_id] = {'status': 'starting', 'progress': 0, 'filename': None, 'error': None}

    safe_name = re.sub(r'[^\w\s\-.]', '', filename).strip() + '.mp4'
    output_path = os.path.join(ANIME_DIR, safe_name)

    thread = threading.Thread(target=_do_anime_download, args=(task_id, hls_url, output_path, safe_name, referer))
    thread.daemon = True
    thread.start()

    return jsonify({'task_id': task_id})


def _do_anime_download(task_id, hls_url, output_path, filename, referer):
    try:
        download_tasks[task_id]['status'] = 'downloading'
        cmd = [
            'ffmpeg', '-y',
            '-headers', f'Referer: {referer}\r\n',
            '-i', hls_url,
            '-c', 'copy',
            '-bsf:a', 'aac_adtstoasc',
            output_path,
        ]
        process = subprocess.Popen(cmd, stderr=subprocess.PIPE, universal_newlines=True)

        duration = None
        for line in process.stderr:
            dur_match = re.search(r'Duration:\s*(\d+):(\d+):(\d+)', line)
            if dur_match:
                h, m, s = int(dur_match.group(1)), int(dur_match.group(2)), int(dur_match.group(3))
                duration = h * 3600 + m * 60 + s

            time_match = re.search(r'time=(\d+):(\d+):(\d+)', line)
            if time_match and duration and duration > 0:
                h, m, s = int(time_match.group(1)), int(time_match.group(2)), int(time_match.group(3))
                current = h * 3600 + m * 60 + s
                pct = min(100, round(current / duration * 100, 1))
                download_tasks[task_id]['progress'] = pct

        process.wait()
        if process.returncode == 0:
            download_tasks[task_id]['status'] = 'complete'
            download_tasks[task_id]['filename'] = filename
            download_tasks[task_id]['progress'] = 100
        else:
            download_tasks[task_id]['status'] = 'error'
            download_tasks[task_id]['error'] = 'ffmpeg exited with non-zero status'
    except Exception as e:
        download_tasks[task_id]['status'] = 'error'
        download_tasks[task_id]['error'] = str(e)


@app.route('/api/downloads/anime/<filename>')
def serve_anime_download(filename):
    return send_from_directory(ANIME_DIR, filename, as_attachment=True)


# ─── Downloads list ──────────────────────────────────────────────────────────

@app.route('/api/downloads/list')
def list_downloads():
    yt_files = sorted([f for f in os.listdir(YOUTUBE_DIR) if not f.startswith('.')]) if os.path.exists(YOUTUBE_DIR) else []
    anime_files = sorted([f for f in os.listdir(ANIME_DIR) if not f.startswith('.')]) if os.path.exists(ANIME_DIR) else []

    vault_files = []
    try:
        resp = http_requests.get(f'{ANIMEVAULT_API}/api/files', timeout=5)
        if resp.ok:
            vault_files = resp.json().get('files', [])
    except Exception:
        pass

    return jsonify({'youtube': yt_files, 'anime': anime_files, 'vault': vault_files})


# ─── server.py (FastAPI) proxy (/api/ytdl/*) ─────────────────────────────────

@app.route('/api/ytdl/info')
def ytdl_info():
    try:
        resp = http_requests.get(f'{YTDL_API}/api/info', params=request.args, timeout=30)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'YTDL API unavailable: {e}'}), 502


@app.route('/api/ytdl/download', methods=['POST'])
def ytdl_download():
    try:
        resp = http_requests.post(f'{YTDL_API}/api/download', json=request.json, timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'YTDL API unavailable: {e}'}), 502


@app.route('/api/ytdl/queue')
def ytdl_queue():
    try:
        resp = http_requests.get(f'{YTDL_API}/api/queue', timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'YTDL API unavailable: {e}'}), 502


@app.route('/api/ytdl/queue/<tid>', methods=['DELETE'])
def ytdl_queue_delete(tid):
    try:
        resp = http_requests.delete(f'{YTDL_API}/api/queue/{tid}', timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'YTDL API unavailable: {e}'}), 502


@app.route('/api/ytdl/files')
def ytdl_files():
    try:
        resp = http_requests.get(f'{YTDL_API}/api/files', timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'YTDL API unavailable: {e}'}), 502


@app.route('/api/ytdl/metadata', methods=['GET', 'POST'])
def ytdl_metadata():
    try:
        if request.method == 'POST':
            resp = http_requests.post(f'{YTDL_API}/api/metadata', json=request.json, timeout=30)
        else:
            resp = http_requests.get(f'{YTDL_API}/api/metadata', params=request.args, timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'YTDL API unavailable: {e}'}), 502


@app.route('/api/ytdl/status')
def ytdl_status():
    try:
        resp = http_requests.get(f'{YTDL_API}/api/status', timeout=5)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'YTDL API unavailable: {e}'}), 502


# ─── anime-vault (Express) proxy (/api/vault/*) ─────────────────────────────

@app.route('/api/vault/files')
def vault_files():
    try:
        resp = http_requests.get(f'{ANIMEVAULT_API}/api/files', timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


@app.route('/api/vault/files/<path:filename>', methods=['DELETE'])
def vault_files_delete(filename):
    try:
        resp = http_requests.delete(f'{ANIMEVAULT_API}/api/files/{filename}', timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


@app.route('/api/vault/download/<path:filename>')
def vault_download(filename):
    try:
        resp = http_requests.get(
            f'{ANIMEVAULT_API}/api/download/{filename}',
            headers={k: v for k, v in request.headers if k.lower() in ('range',)},
            stream=True, timeout=300,
        )
        headers = {k: v for k, v in resp.headers.items()
                   if k.lower() in ('content-type', 'content-length', 'content-range',
                                    'content-disposition', 'accept-ranges')}
        return Response(resp.iter_content(chunk_size=8192), status=resp.status_code, headers=headers)
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


@app.route('/api/vault/zip', methods=['POST'])
def vault_zip():
    try:
        resp = http_requests.post(f'{ANIMEVAULT_API}/api/zip', json=request.json, stream=True, timeout=600)
        headers = {k: v for k, v in resp.headers.items()
                   if k.lower() in ('content-type', 'content-disposition', 'transfer-encoding')}
        return Response(resp.iter_content(chunk_size=8192), status=resp.status_code, headers=headers)
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


@app.route('/api/vault/queue', methods=['GET', 'POST'])
def vault_queue():
    try:
        if request.method == 'POST':
            resp = http_requests.post(f'{ANIMEVAULT_API}/api/queue', json=request.json, timeout=10)
        else:
            resp = http_requests.get(f'{ANIMEVAULT_API}/api/queue', timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


@app.route('/api/vault/queue/<qid>', methods=['DELETE'])
def vault_queue_delete(qid):
    try:
        resp = http_requests.delete(f'{ANIMEVAULT_API}/api/queue/{qid}', timeout=10)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


@app.route('/api/vault/sftp/<action>', methods=['POST'])
def vault_sftp(action):
    try:
        resp = http_requests.post(f'{ANIMEVAULT_API}/api/sftp/{action}', json=request.json, timeout=30)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


@app.route('/api/vault/sysinfo')
def vault_sysinfo():
    try:
        resp = http_requests.get(f'{ANIMEVAULT_API}/api/sysinfo', timeout=5)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


@app.route('/api/vault/meta/write', methods=['POST'])
def vault_meta_write():
    try:
        resp = http_requests.post(f'{ANIMEVAULT_API}/api/meta/write', json=request.json, timeout=30)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return jsonify({'error': f'Vault API unavailable: {e}'}), 502


# ─── Health check ────────────────────────────────────────────────────────────

@app.route('/api/health')
def health():
    services = {}
    for name, url in [('hianime-api', f'{HIANIME_API}/../hianime'), ('ytdl', f'{YTDL_API}/api/status'), ('vault', f'{ANIMEVAULT_API}/health')]:
        try:
            r = http_requests.get(url, timeout=3)
            services[name] = 'ok' if r.status_code < 500 else 'error'
        except Exception:
            services[name] = 'offline'
    services['flask'] = 'ok'
    return jsonify(services)


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=8080)
