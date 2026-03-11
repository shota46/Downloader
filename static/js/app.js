// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.remove('active');
            c.classList.add('hidden');
        });
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.tab);
        target.classList.remove('hidden');
        target.classList.add('active');

        if (tab.dataset.tab === 'downloads') loadDownloadsList();
        if (tab.dataset.tab === 'vault') {
            // Vault observer handles loading
        }
    });
});

// Utilities
function formatDuration(seconds) {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes) {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${bytes.toFixed(1)} ${units[i]}`;
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideError(el) {
    el.classList.add('hidden');
}

function pollProgress(taskId, fillEl, textEl, onComplete, onError) {
    const interval = setInterval(async () => {
        try {
            const resp = await fetch(`/api/youtube/progress/${taskId}`);
            const data = await resp.json();
            fillEl.style.width = data.progress + '%';
            textEl.textContent = data.progress + '%';

            if (data.status === 'complete') {
                clearInterval(interval);
                onComplete(data.filename);
            } else if (data.status === 'error') {
                clearInterval(interval);
                if (onError) onError(data.error);
            }
        } catch {
            clearInterval(interval);
            if (onError) onError('Connection lost');
        }
    }, 500);
    return interval;
}

// Downloads list
async function loadDownloadsList() {
    const container = document.getElementById('downloads-list');
    try {
        const resp = await fetch('/api/downloads/list');
        const data = await resp.json();
        let html = '';

        if (data.youtube.length > 0) {
            html += '<div class="download-section"><h3>YouTube</h3>';
            data.youtube.forEach(f => {
                html += `<div class="download-item"><span>${f}</span><a href="/api/downloads/youtube/${encodeURIComponent(f)}">DL</a></div>`;
            });
            html += '</div>';
        }

        if (data.anime.length > 0) {
            html += '<div class="download-section"><h3>Anime</h3>';
            data.anime.forEach(f => {
                html += `<div class="download-item"><span>${f}</span><a href="/api/downloads/anime/${encodeURIComponent(f)}">DL</a></div>`;
            });
            html += '</div>';
        }

        if (!data.youtube.length && !data.anime.length) {
            html = '<div class="empty-state">ダウンロード済みファイルはありません</div>';
        }

        container.innerHTML = html;
    } catch {
        container.innerHTML = '<div class="error">ファイル一覧の取得に失敗しました</div>';
    }
}
