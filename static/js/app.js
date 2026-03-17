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

        // Emit custom event for tab modules
        document.dispatchEvent(new CustomEvent('tabchange', { detail: tab.dataset.tab }));

        if (tab.dataset.tab === 'downloads') loadDownloadsList();
        if (tab.dataset.tab === 'vault') loadVaultFiles();
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

        if (data.youtube && data.youtube.length > 0) {
            html += '<div class="download-section"><h3>動画 (Local)</h3>';
            data.youtube.forEach(f => {
                html += `<div class="download-item"><span>${f}</span><a href="/api/downloads/youtube/${encodeURIComponent(f)}">DL</a></div>`;
            });
            html += '</div>';
        }

        if (data.anime && data.anime.length > 0) {
            html += '<div class="download-section"><h3>Anime (HLS)</h3>';
            data.anime.forEach(f => {
                html += `<div class="download-item"><span>${f}</span><a href="/api/downloads/anime/${encodeURIComponent(f)}">DL</a></div>`;
            });
            html += '</div>';
        }

        if (data.vault && data.vault.length > 0) {
            html += '<div class="download-section"><h3>Vault</h3>';
            data.vault.forEach(f => {
                html += `<div class="download-item"><span>${f.name} <small class="text-muted">${f.size} | ${f.date}</small></span><a href="/api/vault/download/${encodeURIComponent(f.path || f.name)}">DL</a></div>`;
            });
            html += '</div>';
        }

        if (!html) {
            html = '<div class="empty-state">ダウンロード済みファイルはありません</div>';
        }

        container.innerHTML = html;
    } catch {
        container.innerHTML = '<div class="error">ファイル一覧の取得に失敗しました</div>';
    }
}

// ─── Vault files ─────────────────────────────────────────
async function loadVaultFiles() {
    const container = document.getElementById('vault-file-list');
    const loading = document.getElementById('vault-loading');
    const errorEl = document.getElementById('vault-error');
    if (!container) return;

    loading?.classList.remove('hidden');
    errorEl?.classList.add('hidden');

    try {
        const resp = await fetch('/api/vault/files');
        const data = await resp.json();
        loading?.classList.add('hidden');

        if (!data.ok || !data.files || !data.files.length) {
            container.innerHTML = '<div class="empty-state">ファイルなし</div>';
            return;
        }

        // Group by series
        const grouped = {};
        data.files.forEach(f => {
            const key = f.series || 'その他';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(f);
        });

        let html = '';
        for (const [series, files] of Object.entries(grouped)) {
            html += `<div class="vault-series"><h3>${series} <small>(${files.length})</small></h3><div class="vault-files">`;
            files.sort((a, b) => (a.ep || 0) - (b.ep || 0)).forEach(f => {
                html += `
                    <div class="vault-file-item">
                        <span class="vault-file-name">${f.name}</span>
                        <span class="vault-file-meta">${f.quality} | ${f.size} | ${f.date}</span>
                        <div class="vault-file-actions">
                            <a href="/api/vault/download/${encodeURIComponent(f.path || f.name)}" class="btn-small">DL</a>
                            <button class="btn-small btn-danger" onclick="deleteVaultFile('${f.name.replace(/'/g, "\\'")}')">削除</button>
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';
        }
        container.innerHTML = html;
    } catch {
        loading?.classList.add('hidden');
        if (errorEl) showError(errorEl, 'Vault サーバーに接続できません');
        container.innerHTML = '';
    }

    loadVaultSysinfo();
}

async function loadVaultSysinfo() {
    try {
        const resp = await fetch('/api/vault/sysinfo');
        const data = await resp.json();
        if (!data.ok) return;
        document.getElementById('vault-sysinfo')?.classList.remove('hidden');
        const memEl = document.getElementById('vault-mem');
        const diskEl = document.getElementById('vault-disk');
        const uptimeEl = document.getElementById('vault-uptime');
        if (memEl) memEl.textContent = `Mem: ${data.mem}`;
        if (diskEl) diskEl.textContent = `Disk: ${data.disk}`;
        if (uptimeEl) uptimeEl.textContent = `Uptime: ${data.uptime}`;
    } catch {}
}

async function deleteVaultFile(filename) {
    if (!confirm(`${filename} を削除しますか？`)) return;
    try {
        const resp = await fetch(`/api/vault/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        if (resp.ok) loadVaultFiles();
    } catch {}
}

document.getElementById('vault-refresh')?.addEventListener('click', loadVaultFiles);
document.getElementById('vault-zip-all')?.addEventListener('click', async () => {
    try {
        const resp = await fetch('/api/vault/zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folders: true }),
        });
        if (resp.ok) {
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'AnimeVault.zip';
            a.click();
            URL.revokeObjectURL(url);
        }
    } catch {}
});
