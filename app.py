import os
import re
import uuid
import subprocess
import threading
from functools import wraps

from flask import Flask, Response, render_template, request, jsonify, send_from_directory
import yt_dlp
import requests as http_requests

app = Flask(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
YOUTUBE_DIR = os.path.join(DOWNLOAD_DIR, 'youtube')
ANIME_DIR = os.path.join(DOWNLOAD_DIR, 'anime')

CONSUMET_API = os.environ.get('CONSUMET_API', 'http://localhost:3000')
ANIME_PROVIDER = os.environ.get('ANIME_PROVIDER', 'animepahe')
YTDL_API = os.environ.get('YTDL_API', 'http://localhost:8765')
ANIMEVAULT_API = os.environ.get('ANIMEVAULT_API', 'http://localhost:4040')
PORT = int(os.environ.get('PORT', os.environ.get('APP_PORT', 8080)))

TIMEOUTS = {
    'default': 10,
    'stream': 300,
    'health': 3,
    'short': 5,
}

CHUNK_SIZE = 8192
ALLOWED_STREAM_HEADERS = {
    'content-type', 'content-length', 'accept-ranges',
    'content-disposition', 'content-range', 'transfer-encoding'
}

os.makedirs(YOUTUBE_DIR, exist_ok=True)
os.makedirs(ANIME_DIR, exist_ok=True)

download_tasks = {}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def api_error(message, code=502):
    """Standardized API error response."""
    return jsonify({'error': message}), code


def proxy_request(url, timeout=None, **kwargs):
    """Make a proxied request with standard error handling."""
    try:
        return http_requests.get(url, timeout=timeout or TIMEOUTS['default'], **kwargs)
    except http_requests.RequestException as e:
        return None, str(e)


def create_download_task():
    """Create a new download task entry."""
    task_id = str(uuid.uuid4())
    download_tasks[task_id] = {
        'status': 'starting',
        'progress': 0,
        'filename': None,
        'error': None,
    }
    return task_id


def filter_headers(headers, allowed):
    """Filter response headers to only allowed ones."""
    return {k: v for k, v in headers.items() if k.lower() in allowed}


# ─── Frontend ─────────────────────────────────────────────────────────────────

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')


@app.route('/')
def index():
    react_index = os.path.join(FRONTEND_DIR, 'index.html')
    if os.path.exists(react_index):
        return send_from_directory(FRONTEND_DIR, 'index.html')
    return render_template('index.html')


@app.route('/assets/<path:filename>')
def serve_react_assets(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'assets'), filename)


# ─── YouTube Simple ───────────────────────────────────────────────────────────

YTDL_FORMATS = {
    'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '1080': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
    '720': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
    '480': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]',
    '360': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]',
    'audio': 'bestaudio[ext=m4a]/bestaudio',
}


@app.route('/api/youtube/info')
def youtube_info():
    url = request.args.get('url', '').strip()
    if not url:
        return api_error('URL required', 400)

    try:
        with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
            info = ydl.extract_info(url, download=False)

        formats = [{
            'format_id': f.get('format_id'),
            'ext': f.get('ext'),
            'resolution': f.get('resolution', 'audio only'),
            'filesize': f.get('filesize') or f.get('filesize_approx'),
            'vcodec': f.get('vcodec'),
            'acodec': f.get('acodec'),
            'format_note': f.get('format_note', ''),
            'fps': f.get('fps'),
        } for f in info.get('formats', [])]

        return jsonify({
            'title': info.get('title'),
            'thumbnail': info.get('thumbnail'),
            'duration': info.get('duration'),
            'uploader': info.get('uploader'),
            'formats': formats,
        })
    except Exception as e:
        return api_error(str(e), 500)


@app.route('/api/youtube/download', methods=['POST'])
def youtube_download():
    data = request.json or {}
    url = data.get('url', '').strip()
    quality = data.get('quality', 'best')
    custom_filename = data.get('filename', '').strip()
    trim = data.get('trim', False)
    start_time = data.get('start')
    end_time = data.get('end')

    if not url:
        return api_error('URL required', 400)

    task_id = create_download_task()
    thread = threading.Thread(target=_do_youtube_download, args=(
        task_id, url, quality, custom_filename, trim, start_time, end_time
    ))
    thread.daemon = True
    thread.start()

    return jsonify({'task_id': task_id})


def parse_timestamp(ts):
    """Parse timestamp string to seconds. Formats: '1:30', '1:30:45', '90'"""
    if not ts:
        return None
    try:
        parts = ts.split(':')
        if len(parts) == 1:
            return int(parts[0])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except (ValueError, AttributeError):
        pass
    return None


def _do_youtube_download(task_id, url, quality, custom_filename, trim, start_time, end_time):
    def progress_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            pct = (downloaded / total * 100) if total > 0 else 0
            download_tasks[task_id].update({'status': 'downloading', 'progress': round(pct, 1)})
        elif d['status'] == 'finished':
            download_tasks[task_id].update({'status': 'processing', 'progress': 100})

    # Determine file extension
    is_audio = quality == 'audio'
    ext = 'mp3' if is_audio else 'mp4'

    # Build output template
    if custom_filename:
        safe_name = re.sub(r'[^\w\s\-.]', '', custom_filename).strip()
        outtmpl = os.path.join(YOUTUBE_DIR, safe_name + '.%(ext)s')
    else:
        outtmpl = os.path.join(YOUTUBE_DIR, '%(title)s.%(ext)s')

    ydl_opts = {
        'format': YTDL_FORMATS.get(quality, YTDL_FORMATS['best']),
        'outtmpl': outtmpl,
        'progress_hooks': [progress_hook],
        'quiet': True,
    }

    # Add download sections for trimming (yt-dlp native)
    if trim and (start_time or end_time):
        start_sec = parse_timestamp(start_time)
        end_sec = parse_timestamp(end_time)
        if start_sec is not None or end_sec is not None:
            start_str = str(start_sec) if start_sec else '0'
            end_str = str(end_sec) if end_sec else ''
            ydl_opts['download_ranges'] = lambda info, ydl: [{'start_time': start_sec or 0, 'end_time': end_sec or info.get('duration', 0)}]

    if is_audio:
        ydl_opts['postprocessors'] = [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3'}]
    else:
        ydl_opts['merge_output_format'] = 'mp4'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url)
            filename = ydl.prepare_filename(info)
            if is_audio:
                filename = os.path.splitext(filename)[0] + '.mp3'
            elif not filename.endswith('.mp4'):
                filename = os.path.splitext(filename)[0] + '.mp4'

        # If trimming is enabled but not handled by yt-dlp, use ffmpeg
        if trim and (start_time or end_time):
            start_sec = parse_timestamp(start_time)
            end_sec = parse_timestamp(end_time)
            if start_sec is not None or end_sec is not None:
                download_tasks[task_id]['status'] = 'trimming'
                trimmed_path = _trim_video(filename, start_sec, end_sec)
                if trimmed_path:
                    filename = trimmed_path

        download_tasks[task_id].update({'status': 'complete', 'filename': os.path.basename(filename)})
    except Exception as e:
        download_tasks[task_id].update({'status': 'error', 'error': str(e)})


def _trim_video(input_path, start_sec, end_sec):
    """Trim video using ffmpeg."""
    try:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_trimmed{ext}"

        cmd = ['ffmpeg', '-y']
        if start_sec is not None:
            cmd.extend(['-ss', str(start_sec)])
        cmd.extend(['-i', input_path])
        if end_sec is not None and start_sec is not None:
            duration = end_sec - start_sec
            cmd.extend(['-t', str(duration)])
        elif end_sec is not None:
            cmd.extend(['-t', str(end_sec)])
        cmd.extend(['-c', 'copy', output_path])

        result = subprocess.run(cmd, capture_output=True, timeout=300)
        if result.returncode == 0 and os.path.exists(output_path):
            # Replace original with trimmed version
            os.replace(output_path, input_path)
            return input_path
    except Exception:
        pass
    return None


@app.route('/api/youtube/progress/<task_id>')
def youtube_progress(task_id):
    task = download_tasks.get(task_id)
    if not task:
        return api_error('Task not found', 404)
    return jsonify(task)


@app.route('/api/downloads/youtube/<filename>')
def serve_youtube_download(filename):
    return send_from_directory(YOUTUBE_DIR, filename, as_attachment=True)


# ─── Anime API ────────────────────────────────────────────────────────────────

def _anime_request(endpoint, *args, **kwargs):
    """Helper for making requests to consumet-api."""
    base_url = f'{CONSUMET_API}/anime/{ANIME_PROVIDER}'

    if ANIME_PROVIDER == 'animepahe':
        if endpoint == 'info':
            url = f'{base_url}/info/{args[0]}' if args else f'{base_url}/info'
        elif endpoint == 'watch':
            url = f'{base_url}/watch'
        else:
            url = f'{base_url}/{endpoint}'
    else:
        if endpoint == 'info':
            url = f'{base_url}/info'
        elif endpoint == 'watch':
            url = f'{base_url}/watch/{args[0]}' if args else f'{base_url}/watch'
        else:
            url = f'{base_url}/{endpoint}'

    try:
        return http_requests.get(url, timeout=TIMEOUTS['default'], **kwargs), None
    except http_requests.RequestException as e:
        return None, str(e)


@app.route('/api/anime/home')
def anime_home():
    resp, err = _anime_request('')
    if err:
        return api_error(f'Anime API unavailable: {err}')
    return jsonify(resp.json())


@app.route('/api/anime/search')
def anime_search():
    keyword = request.args.get('keyword', '')
    page = request.args.get('page', '1')
    resp, err = _anime_request(keyword, params={'page': page})
    if err:
        return api_error(f'Anime API unavailable: {err}')
    return jsonify(resp.json())


@app.route('/api/anime/info/<path:anime_id>')
def anime_info(anime_id):
    if ANIME_PROVIDER == 'animepahe':
        resp, err = _anime_request('info', anime_id)
    else:
        resp, err = _anime_request('info', params={'id': anime_id})
    if err:
        return api_error(f'Anime API unavailable: {err}')
    return jsonify(resp.json())


@app.route('/api/anime/episodes/<path:anime_id>')
def anime_episodes(anime_id):
    if ANIME_PROVIDER == 'animepahe':
        resp, err = _anime_request('info', anime_id)
    else:
        resp, err = _anime_request('info', params={'id': anime_id})
    if err:
        return api_error(f'Anime API unavailable: {err}')
    return jsonify({'data': {'episodes': resp.json().get('episodes', [])}})


@app.route('/api/anime/stream')
def anime_stream():
    ep_id = request.args.get('id', '')
    server = request.args.get('server', '')

    params = {'episodeId': ep_id} if ANIME_PROVIDER == 'animepahe' else {}
    if server:
        params['server'] = server

    if ANIME_PROVIDER == 'animepahe':
        resp, err = _anime_request('watch', params=params)
    else:
        resp, err = _anime_request('watch', ep_id, params=params if server else None)

    if err:
        return api_error(f'Anime API unavailable: {err}')

    data = resp.json()
    return jsonify({
        'data': {
            'sources': data.get('sources', []),
            'download': data.get('download', []),
            'headers': data.get('headers', {}),
            'tracks': data.get('subtitles', [])
        }
    })


@app.route('/api/anime/download', methods=['POST'])
def anime_download():
    data = request.json or {}
    download_url = data.get('url', '').strip()
    filename = data.get('filename', 'anime_episode')
    referer = data.get('referer', 'https://kwik.cx/')

    if not download_url:
        return api_error('URL required', 400)

    task_id = create_download_task()
    safe_name = re.sub(r'[^\w\s\-.]', '', filename).strip()
    if not safe_name.endswith('.mp4'):
        safe_name += '.mp4'
    output_path = os.path.join(ANIME_DIR, safe_name)

    # Check if URL is direct MP4 or HLS
    is_hls = '.m3u8' in download_url.lower()

    thread = threading.Thread(target=_do_anime_download, args=(
        task_id, download_url, output_path, safe_name, referer, is_hls
    ))
    thread.daemon = True
    thread.start()

    return jsonify({'task_id': task_id})


def _do_anime_download(task_id, download_url, output_path, filename, referer, is_hls=True):
    try:
        download_tasks[task_id]['status'] = 'downloading'

        # Build headers
        headers = [
            f'Referer: {referer}',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept: */*',
            'Accept-Language: en-US,en;q=0.9',
        ]
        headers_str = '\r\n'.join(headers) + '\r\n'

        if is_hls:
            # HLS stream - use ffmpeg
            cmd = [
                'ffmpeg', '-y',
                '-headers', headers_str,
                '-i', download_url,
                '-c', 'copy',
                '-bsf:a', 'aac_adtstoasc',
                output_path
            ]
            process = subprocess.Popen(cmd, stderr=subprocess.PIPE, universal_newlines=True)

            duration = None
            last_lines = []

            for line in process.stderr:
                last_lines.append(line.rstrip())
                if len(last_lines) > 20:
                    last_lines.pop(0)

                dur_match = re.search(r'Duration:\s*(\d+):(\d+):(\d+)', line)
                if dur_match:
                    h, m, s = map(int, dur_match.groups())
                    duration = h * 3600 + m * 60 + s

                time_match = re.search(r'time=(\d+):(\d+):(\d+)', line)
                if time_match and duration and duration > 0:
                    h, m, s = map(int, time_match.groups())
                    current = h * 3600 + m * 60 + s
                    download_tasks[task_id]['progress'] = min(100, round(current / duration * 100, 1))

            process.wait()
            if process.returncode == 0:
                download_tasks[task_id].update({'status': 'complete', 'filename': filename, 'progress': 100})
            else:
                download_tasks[task_id].update({
                    'status': 'error',
                    'error': f'ffmpeg exit {process.returncode}: ' + '\n'.join(last_lines[-5:])
                })
        else:
            # Direct MP4 download - use http_requests with progress
            head_resp = http_requests.head(download_url, headers={'Referer': referer}, timeout=10)
            total_size = int(head_resp.headers.get('content-length', 0))

            resp = http_requests.get(download_url, headers={'Referer': referer}, stream=True, timeout=300)

            downloaded = 0
            with open(output_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            download_tasks[task_id]['progress'] = round(downloaded / total_size * 100, 1)

            download_tasks[task_id].update({'status': 'complete', 'filename': filename, 'progress': 100})

    except Exception as e:
        download_tasks[task_id].update({'status': 'error', 'error': str(e)})


@app.route('/api/anime/progress/<task_id>')
def anime_progress(task_id):
    task = download_tasks.get(task_id)
    if not task:
        return api_error('Task not found', 404)
    return jsonify(task)


@app.route('/api/downloads/anime/<filename>')
def serve_anime_download(filename):
    return send_from_directory(ANIME_DIR, filename, as_attachment=True)


# ─── Downloads List ───────────────────────────────────────────────────────────

@app.route('/api/downloads/list')
def list_downloads():
    yt_files = sorted([f for f in os.listdir(YOUTUBE_DIR) if not f.startswith('.')]) if os.path.exists(YOUTUBE_DIR) else []
    anime_files = sorted([f for f in os.listdir(ANIME_DIR) if not f.startswith('.')]) if os.path.exists(ANIME_DIR) else []

    vault_files = []
    try:
        resp = http_requests.get(f'{ANIMEVAULT_API}/api/files', timeout=TIMEOUTS['short'])
        if resp.ok:
            vault_files = resp.json().get('files', [])
    except Exception:
        pass

    return jsonify({'youtube': yt_files, 'anime': anime_files, 'vault': vault_files})


# ─── YTDL API Proxy ───────────────────────────────────────────────────────────

@app.route('/api/ytdl/info')
def ytdl_info():
    resp = proxy_request(f'{YTDL_API}/api/info', params=request.args, timeout=30)
    if isinstance(resp, tuple):
        return api_error(f'YTDL API unavailable: {resp[1]}')
    return jsonify(resp.json()), resp.status_code


@app.route('/api/ytdl/download', methods=['POST'])
def ytdl_download():
    try:
        resp = http_requests.post(f'{YTDL_API}/api/download', json=request.json, timeout=TIMEOUTS['default'])
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'YTDL API unavailable: {e}')


@app.route('/api/ytdl/queue')
def ytdl_queue():
    resp = proxy_request(f'{YTDL_API}/api/queue')
    if isinstance(resp, tuple):
        return api_error(f'YTDL API unavailable: {resp[1]}')
    return jsonify(resp.json()), resp.status_code


@app.route('/api/ytdl/queue/<tid>', methods=['DELETE'])
def ytdl_queue_delete(tid):
    try:
        resp = http_requests.delete(f'{YTDL_API}/api/queue/{tid}', timeout=TIMEOUTS['default'])
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'YTDL API unavailable: {e}')


@app.route('/api/ytdl/files', methods=['GET', 'DELETE'])
def ytdl_files():
    try:
        if request.method == 'DELETE':
            resp = http_requests.delete(f'{YTDL_API}/api/files', params=request.args, timeout=TIMEOUTS['default'])
        else:
            resp = http_requests.get(f'{YTDL_API}/api/files', timeout=TIMEOUTS['default'])
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'YTDL API unavailable: {e}')


@app.route('/api/ytdl/stream/<path:file_path>')
def ytdl_stream(file_path):
    try:
        resp = http_requests.get(f'{YTDL_API}/api/stream/{file_path}', stream=True, timeout=TIMEOUTS['stream'])
        headers = filter_headers(resp.headers, ALLOWED_STREAM_HEADERS)
        return Response(resp.iter_content(chunk_size=CHUNK_SIZE), status=resp.status_code, headers=headers)
    except http_requests.RequestException as e:
        return api_error(f'YTDL API unavailable: {e}')


@app.route('/api/ytdl/logs')
def ytdl_logs():
    resp = proxy_request(f'{YTDL_API}/api/logs', params=request.args)
    if isinstance(resp, tuple):
        return api_error(f'YTDL API unavailable: {resp[1]}')
    return jsonify(resp.json()), resp.status_code


@app.route('/api/ytdl/metadata', methods=['GET', 'POST'])
def ytdl_metadata():
    try:
        if request.method == 'POST':
            resp = http_requests.post(f'{YTDL_API}/api/metadata', json=request.json, timeout=30)
        else:
            resp = http_requests.get(f'{YTDL_API}/api/metadata', params=request.args, timeout=TIMEOUTS['default'])
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'YTDL API unavailable: {e}')


@app.route('/api/ytdl/status')
def ytdl_status():
    resp = proxy_request(f'{YTDL_API}/api/status', timeout=TIMEOUTS['short'])
    if isinstance(resp, tuple):
        return api_error(f'YTDL API unavailable: {resp[1]}')
    return jsonify(resp.json()), resp.status_code


# ─── Vault API Proxy ──────────────────────────────────────────────────────────

@app.route('/api/vault/health')
def vault_health():
    resp = proxy_request(f'{ANIMEVAULT_API}/health', timeout=TIMEOUTS['short'])
    if isinstance(resp, tuple):
        return api_error(f'Vault API unavailable: {resp[1]}')
    return jsonify(resp.json()), resp.status_code


@app.route('/api/vault/files')
def vault_files():
    resp = proxy_request(f'{ANIMEVAULT_API}/api/files')
    if isinstance(resp, tuple):
        return api_error(f'Vault API unavailable: {resp[1]}')
    return jsonify(resp.json()), resp.status_code


@app.route('/api/vault/files/<path:filename>', methods=['DELETE'])
def vault_files_delete(filename):
    try:
        resp = http_requests.delete(f'{ANIMEVAULT_API}/api/files/{filename}', timeout=TIMEOUTS['default'])
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'Vault API unavailable: {e}')


@app.route('/api/vault/download/<path:filename>')
def vault_download(filename):
    try:
        headers = {k: v for k, v in request.headers if k.lower() in ('range',)}
        resp = http_requests.get(f'{ANIMEVAULT_API}/api/download/{filename}',
                                  headers=headers, stream=True, timeout=TIMEOUTS['stream'])
        return Response(resp.iter_content(chunk_size=CHUNK_SIZE), status=resp.status_code,
                        headers=filter_headers(resp.headers, ALLOWED_STREAM_HEADERS))
    except http_requests.RequestException as e:
        return api_error(f'Vault API unavailable: {e}')


@app.route('/api/vault/zip', methods=['POST'])
def vault_zip():
    try:
        resp = http_requests.post(f'{ANIMEVAULT_API}/api/zip', json=request.json,
                                   stream=True, timeout=600)
        return Response(resp.iter_content(chunk_size=CHUNK_SIZE), status=resp.status_code,
                        headers=filter_headers(resp.headers, ALLOWED_STREAM_HEADERS))
    except http_requests.RequestException as e:
        return api_error(f'Vault API unavailable: {e}')


@app.route('/api/vault/queue', methods=['GET', 'POST'])
def vault_queue():
    try:
        if request.method == 'POST':
            resp = http_requests.post(f'{ANIMEVAULT_API}/api/queue', json=request.json, timeout=TIMEOUTS['default'])
        else:
            resp = http_requests.get(f'{ANIMEVAULT_API}/api/queue', timeout=TIMEOUTS['default'])
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'Vault API unavailable: {e}')


@app.route('/api/vault/queue/<qid>', methods=['DELETE'])
def vault_queue_delete(qid):
    try:
        resp = http_requests.delete(f'{ANIMEVAULT_API}/api/queue/{qid}', timeout=TIMEOUTS['default'])
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'Vault API unavailable: {e}')


@app.route('/api/vault/sftp/<action>', methods=['GET', 'POST'])
def vault_sftp(action):
    try:
        url = f'{ANIMEVAULT_API}/api/sftp/{action}'
        if request.method == 'POST':
            resp = http_requests.post(url, json=request.json, timeout=30)
        else:
            resp = http_requests.get(url, params=request.args, timeout=TIMEOUTS['default'])
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'Vault API unavailable: {e}')


@app.route('/api/vault/sysinfo')
def vault_sysinfo():
    resp = proxy_request(f'{ANIMEVAULT_API}/api/sysinfo', timeout=TIMEOUTS['short'])
    if isinstance(resp, tuple):
        return api_error(f'Vault API unavailable: {resp[1]}')
    return jsonify(resp.json()), resp.status_code


@app.route('/api/vault/meta/write', methods=['POST'])
def vault_meta_write():
    try:
        resp = http_requests.post(f'{ANIMEVAULT_API}/api/meta/write', json=request.json, timeout=30)
        return jsonify(resp.json()), resp.status_code
    except http_requests.RequestException as e:
        return api_error(f'Vault API unavailable: {e}')


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.route('/api/health')
def health():
    services = {'flask': 'ok'}
    checks = [
        ('consumet-api', f'{CONSUMET_API}/anime/{ANIME_PROVIDER}'),
        ('ytdl', f'{YTDL_API}/api/status'),
        ('vault', f'{ANIMEVAULT_API}/health'),
    ]
    for name, url in checks:
        try:
            r = http_requests.get(url, timeout=TIMEOUTS['health'])
            services[name] = 'ok' if r.status_code < 500 else 'error'
        except Exception:
            services[name] = 'offline'
    return jsonify(services)


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=PORT)
