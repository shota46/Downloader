(function () {
    const errorEl = document.getElementById('vault-error');
    const loadingEl = document.getElementById('vault-loading');
    const filesList = document.getElementById('vault-files-list');
    const refreshBtn = document.getElementById('vault-refresh');
    const zipAllBtn = document.getElementById('vault-zip-all');
    const sysinfoEl = document.getElementById('vault-sysinfo');

    refreshBtn.addEventListener('click', loadFiles);
    zipAllBtn.addEventListener('click', downloadZipAll);

    // Auto-load when tab is shown
    const observer = new MutationObserver(() => {
        const section = document.getElementById('vault');
        if (section && section.classList.contains('active')) {
            loadFiles();
            loadSysinfo();
        }
    });
    observer.observe(document.getElementById('vault'), { attributes: true, attributeFilter: ['class'] });

    async function loadFiles() {
        hideError(errorEl);
        loadingEl.classList.remove('hidden');
        try {
            const resp = await fetch('/api/vault/files');
            const data = await resp.json();

            if (!data.ok) { showError(errorEl, data.error || 'Failed'); return; }

            const files = data.files || [];
            if (files.length === 0) {
                filesList.innerHTML = '<div class="empty-state">ファイルがありません</div>';
                return;
            }

            // Group by series
            const groups = {};
            files.forEach(f => {
                const key = f.series || 'その他';
                if (!groups[key]) groups[key] = [];
                groups[key].push(f);
            });

            let html = '';
            for (const [series, items] of Object.entries(groups)) {
                html += `<div class="vault-section"><h3>${series} (${items.length})</h3>`;
                items.sort((a, b) => (a.ep || 0) - (b.ep || 0));
                items.forEach(f => {
                    html += `
                    <div class="download-item vault-file">
                        <span>${f.name} <small style="color:var(--text-secondary)">${f.quality} | ${f.size} | ${f.date}</small></span>
                        <span class="vault-actions">
                            <a href="/api/vault/download/${encodeURIComponent(f.path)}" title="DL">DL</a>
                            <button class="vault-del" data-name="${f.name}" title="削除">Del</button>
                        </span>
                    </div>`;
                });
                html += '</div>';
            }
            filesList.innerHTML = html;

            filesList.querySelectorAll('.vault-del').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm(`${btn.dataset.name} を削除しますか？`)) return;
                    try {
                        await fetch(`/api/vault/files/${encodeURIComponent(btn.dataset.name)}`, { method: 'DELETE' });
                        loadFiles();
                    } catch {
                        showError(errorEl, '削除に失敗しました');
                    }
                });
            });
        } catch {
            showError(errorEl, 'Vault APIに接続できません');
        } finally {
            loadingEl.classList.add('hidden');
        }
    }

    async function loadSysinfo() {
        try {
            const resp = await fetch('/api/vault/sysinfo');
            const data = await resp.json();
            if (data.ok) {
                sysinfoEl.textContent = `MEM: ${data.mem} | Disk: ${data.disk} | Uptime: ${data.uptime}`;
            }
        } catch {}
    }

    async function downloadZipAll() {
        zipAllBtn.disabled = true;
        zipAllBtn.textContent = 'ZIP作成中...';
        try {
            const resp = await fetch('/api/vault/zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folders: true }),
            });
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'AnimeVault.zip';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            showError(errorEl, 'ZIP作成に失敗しました');
        } finally {
            zipAllBtn.disabled = false;
            zipAllBtn.textContent = '全ZIP';
        }
    }
})();
