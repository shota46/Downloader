(function () {
    // DOM Elements
    const els = {
        urlInput: document.getElementById('yt-url'),
        fetchBtn: document.getElementById('yt-fetch'),
        loading: document.getElementById('yt-loading'),
        error: document.getElementById('yt-error'),
        preview: document.getElementById('yt-preview'),
        thumb: document.getElementById('yt-thumb'),
        title: document.getElementById('yt-title'),
        uploader: document.getElementById('yt-uploader'),
        duration: document.getElementById('yt-duration'),
        downloadBtn: document.getElementById('yt-download'),
        addQueueBtn: document.getElementById('yt-add-queue'),
        progress: document.getElementById('yt-progress'),
        progressFill: document.getElementById('yt-progress-fill'),
        progressText: document.getElementById('yt-progress-text'),
        complete: document.getElementById('yt-complete'),
        downloadLink: document.getElementById('yt-download-link'),
        // New elements
        filename: document.getElementById('yt-filename'),
        selectFolderBtn: document.getElementById('yt-select-folder'),
        folderPath: document.getElementById('yt-folder-path'),
        trimEnable: document.getElementById('yt-trim-enable'),
        trimInputs: document.getElementById('yt-trim-inputs'),
        startTime: document.getElementById('yt-start'),
        endTime: document.getElementById('yt-end'),
        queueSection: document.getElementById('yt-queue-section'),
        queueList: document.getElementById('yt-queue-list'),
        clearQueueBtn: document.getElementById('yt-clear-queue'),
        // Cookie elements
        cookieStatus: document.getElementById('yt-cookie-status'),
        cookieToggle: document.getElementById('yt-cookie-toggle'),
        cookiePanel: document.getElementById('yt-cookie-panel'),
        cookieFile: document.getElementById('yt-cookie-file'),
        cookieUploadBtn: document.getElementById('yt-cookie-upload-btn'),
        cookieFilename: document.getElementById('yt-cookie-filename'),
        cookieSave: document.getElementById('yt-cookie-save'),
        cookieDelete: document.getElementById('yt-cookie-delete'),
    };

    // State
    let currentInfo = null;
    let downloadQueue = [];
    let activeDownloads = 0;
    let directoryHandle = null; // File System Access API
    let selectedCookieFile = null;
    const MAX_CONCURRENT = 3;

    // Utilities
    const escapeHtml = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    const showEl = (el) => el?.classList.remove('hidden');
    const hideEl = (el) => el?.classList.add('hidden');
    const showError = (msg) => { els.error.textContent = msg; showEl(els.error); };
    const hideError = () => hideEl(els.error);

    // Event Listeners
    els.fetchBtn?.addEventListener('click', fetchInfo);
    els.urlInput?.addEventListener('keydown', e => { if (e.key === 'Enter') fetchInfo(); });
    els.downloadBtn?.addEventListener('click', startDownload);
    els.addQueueBtn?.addEventListener('click', addToQueue);
    els.clearQueueBtn?.addEventListener('click', clearQueue);
    els.selectFolderBtn?.addEventListener('click', selectFolder);
    els.trimEnable?.addEventListener('change', () => {
        if (els.trimEnable.checked) {
            showEl(els.trimInputs);
        } else {
            hideEl(els.trimInputs);
        }
    });

    // Cookie event listeners
    els.cookieToggle?.addEventListener('click', () => {
        els.cookiePanel?.classList.toggle('hidden');
    });
    els.cookieUploadBtn?.addEventListener('click', () => els.cookieFile?.click());
    els.cookieFile?.addEventListener('change', handleCookieFileSelect);
    els.cookieSave?.addEventListener('click', uploadCookie);
    els.cookieDelete?.addEventListener('click', deleteCookie);

    // Check cookie status on load
    checkCookieStatus();

    // Cookie functions
    async function checkCookieStatus() {
        try {
            const resp = await fetch('/api/youtube/cookies');
            const data = await resp.json();
            if (data.exists) {
                els.cookieStatus.textContent = `✅ Cookie有効 (${data.entries}件)`;
                els.cookieStatus.classList.add('active');
                els.cookieStatus.classList.remove('inactive');
            } else {
                els.cookieStatus.textContent = '❌ Cookie未設定';
                els.cookieStatus.classList.add('inactive');
                els.cookieStatus.classList.remove('active');
            }
        } catch (e) {
            els.cookieStatus.textContent = '⚠️ Cookie確認エラー';
            els.cookieStatus.classList.add('inactive');
        }
    }

    function handleCookieFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            selectedCookieFile = file;
            els.cookieFilename.textContent = file.name;
            els.cookieSave.disabled = false;
        }
    }

    async function uploadCookie() {
        if (!selectedCookieFile) return;

        const formData = new FormData();
        formData.append('file', selectedCookieFile);

        try {
            const resp = await fetch('/api/youtube/cookies', {
                method: 'POST',
                body: formData
            });
            const data = await resp.json();

            if (data.success) {
                els.cookieStatus.textContent = `✅ Cookie保存完了 (${data.entries}件)`;
                els.cookieStatus.classList.add('active');
                els.cookieStatus.classList.remove('inactive');
                els.cookiePanel?.classList.add('hidden');
                els.cookieSave.disabled = true;
                els.cookieFilename.textContent = '';
                selectedCookieFile = null;
            } else {
                showError(data.error || 'Cookie保存エラー');
            }
        } catch (e) {
            showError('Cookieアップロードエラー');
        }
    }

    async function deleteCookie() {
        try {
            await fetch('/api/youtube/cookies', { method: 'DELETE' });
            els.cookieStatus.textContent = '❌ Cookie未設定';
            els.cookieStatus.classList.add('inactive');
            els.cookieStatus.classList.remove('active');
            els.cookieFilename.textContent = '';
            selectedCookieFile = null;
            els.cookieSave.disabled = true;
        } catch (e) {
            showError('Cookie削除エラー');
        }
    }

    // Check File System Access API support
    const hasFileSystemAccess = 'showDirectoryPicker' in window;

    // Select folder using File System Access API
    async function selectFolder() {
        if (!hasFileSystemAccess) {
            showError('お使いのブラウザは保存先選択に対応していません。Chrome/Edgeを使用してください。');
            return;
        }

        try {
            directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            els.folderPath.textContent = `📁 ${directoryHandle.name}`;
            els.selectFolderBtn.textContent = '変更';
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error('Folder selection error:', e);
            }
        }
    }

    // Fetch video info
    async function fetchInfo() {
        const url = els.urlInput.value.trim();
        if (!url) return;

        hideError();
        hideEl(els.preview);
        hideEl(els.complete);
        hideEl(els.progress);
        showEl(els.loading);
        els.fetchBtn.disabled = true;

        try {
            const resp = await fetch(`/api/youtube/info?url=${encodeURIComponent(url)}`);
            const data = await resp.json();

            if (data.error) {
                showError(data.error);
                return;
            }

            currentInfo = data;
            els.thumb.src = data.thumbnail || '';
            els.title.textContent = data.title || '';
            els.uploader.textContent = data.uploader || '';
            els.duration.textContent = formatDuration(data.duration);

            // Set default filename from title
            if (els.filename && data.title) {
                els.filename.placeholder = data.title;
            }

            showEl(els.preview);
        } catch {
            showError('動画情報の取得に失敗しました');
        } finally {
            hideEl(els.loading);
            els.fetchBtn.disabled = false;
        }
    }

    // Get download options
    function getDownloadOptions() {
        const url = els.urlInput.value.trim();
        const quality = document.querySelector('input[name="quality"]:checked')?.value || 'best';
        const filename = els.filename?.value.trim() || '';
        const trim = els.trimEnable?.checked || false;

        let start = null, end = null;
        if (trim) {
            start = els.startTime?.value.trim() || null;
            end = els.endTime?.value.trim() || null;
        }

        return { url, quality, filename, trim, start, end };
    }

    // Save file to local folder
    async function saveToLocalFolder(filename, blob) {
        if (!directoryHandle) return false;

        try {
            const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true;
        } catch (e) {
            console.error('Save to local folder failed:', e);
            return false;
        }
    }

    // Download and save file
    async function downloadAndSave(url, filename) {
        try {
            const resp = await fetch(url);
            const blob = await resp.blob();

            if (directoryHandle) {
                // Save to selected local folder
                const saved = await saveToLocalFolder(filename, blob);
                if (saved) {
                    return true;
                }
            }

            // Fallback: standard download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            return true;
        } catch (e) {
            console.error('Download failed:', e);
            return false;
        }
    }

    // Start download
    async function startDownload() {
        const options = getDownloadOptions();

        hideError();
        hideEl(els.complete);
        els.downloadBtn.disabled = true;
        els.progressFill.style.width = '0%';
        els.progressText.textContent = '0%';
        showEl(els.progress);

        try {
            const resp = await fetch('/api/youtube/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options),
            });
            const data = await resp.json();

            if (data.error) {
                showError(data.error);
                hideEl(els.progress);
                els.downloadBtn.disabled = false;
                return;
            }

            pollProgress(
                data.task_id,
                els.progressFill,
                els.progressText,
                async filename => {
                    // Download the file and save to local folder
                    const fileUrl = `/api/downloads/youtube/${encodeURIComponent(filename)}`;
                    const saved = await downloadAndSave(fileUrl, filename);

                    els.downloadLink.href = fileUrl;
                    els.downloadLink.textContent = directoryHandle
                        ? `✅ ${filename} (${directoryHandle.name}に保存)`
                        : filename;
                    showEl(els.complete);
                    els.downloadBtn.disabled = false;
                },
                err => {
                    showError(err);
                    els.downloadBtn.disabled = false;
                }
            );
        } catch {
            showError('ダウンロードの開始に失敗しました');
            hideEl(els.progress);
            els.downloadBtn.disabled = false;
        }
    }

    // Add to queue
    function addToQueue() {
        if (!currentInfo) {
            showError('先に動画情報を取得してください');
            return;
        }

        const options = getDownloadOptions();
        const item = {
            id: Date.now(),
            url: options.url,
            title: currentInfo.title,
            thumbnail: currentInfo.thumbnail,
            options: options,
            status: 'pending',
            progress: 0,
            taskId: null,
        };

        downloadQueue.push(item);
        renderQueue();
        processQueue();
    }

    // Render queue
    function renderQueue() {
        if (downloadQueue.length === 0) {
            hideEl(els.queueSection);
            return;
        }

        showEl(els.queueSection);
        els.queueList.innerHTML = downloadQueue.map(item => `
            <div class="queue-item status-${item.status}" data-id="${item.id}">
                <div class="queue-item-header">
                    ${item.thumbnail ? `<img src="${escapeHtml(item.thumbnail)}" class="queue-thumb" alt="">` : ''}
                    <div class="queue-item-info">
                        <div class="queue-title">${escapeHtml(item.title)}</div>
                        <div class="queue-meta">${item.options.quality} | ${item.options.folder}${item.options.trim ? ' | 切り抜き' : ''}</div>
                    </div>
                    <span class="queue-status">${getStatusText(item.status)}</span>
                    <button class="btn-small btn-danger queue-remove" data-id="${item.id}">×</button>
                </div>
                ${['downloading', 'trimming'].includes(item.status) ? `
                    <div class="progress-container">
                        <div class="progress-bar"><div class="progress-fill" style="width:${item.progress}%"></div></div>
                        <span class="progress-text">${Math.round(item.progress)}%</span>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Add remove handlers
        els.queueList.querySelectorAll('.queue-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromQueue(parseInt(btn.dataset.id));
            });
        });
    }

    function getStatusText(status) {
        return {
            pending: '待機中',
            downloading: 'DL中',
            trimming: '切り抜き中',
            complete: '完了',
            error: 'エラー',
        }[status] || status;
    }

    function removeFromQueue(id) {
        downloadQueue = downloadQueue.filter(item => item.id !== id);
        renderQueue();
    }

    function clearQueue() {
        downloadQueue = downloadQueue.filter(item => ['downloading', 'trimming'].includes(item.status));
        renderQueue();
    }

    // Process queue
    async function processQueue() {
        const pending = downloadQueue.filter(item => item.status === 'pending');
        const available = MAX_CONCURRENT - activeDownloads;

        for (let i = 0; i < Math.min(available, pending.length); i++) {
            startQueueDownload(pending[i]);
        }
    }

    async function startQueueDownload(item) {
        item.status = 'downloading';
        activeDownloads++;
        renderQueue();

        try {
            const resp = await fetch('/api/youtube/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.options),
            });
            const data = await resp.json();

            if (data.error) {
                item.status = 'error';
                renderQueue();
                return;
            }

            item.taskId = data.task_id;
            pollQueueItem(item);
        } catch {
            item.status = 'error';
            renderQueue();
        }
    }

    function pollQueueItem(item) {
        const interval = setInterval(async () => {
            try {
                const resp = await fetch(`/api/youtube/progress/${item.taskId}`);
                const data = await resp.json();

                if (!data) return;

                item.progress = data.progress || 0;
                item.status = data.status === 'trimming' ? 'trimming' : (data.status === 'downloading' ? 'downloading' : item.status);
                renderQueue();

                if (data.status === 'complete') {
                    clearInterval(interval);
                    item.status = 'complete';
                    item.progress = 100;
                    activeDownloads--;
                    renderQueue();
                    processQueue();
                } else if (data.status === 'error') {
                    clearInterval(interval);
                    item.status = 'error';
                    activeDownloads--;
                    renderQueue();
                    processQueue();
                }
            } catch {
                clearInterval(interval);
                item.status = 'error';
                activeDownloads--;
                renderQueue();
                processQueue();
            }
        }, 500);
    }
})();
