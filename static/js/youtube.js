(function () {
    const urlInput = document.getElementById('yt-url');
    const fetchBtn = document.getElementById('yt-fetch');
    const loadingEl = document.getElementById('yt-loading');
    const errorEl = document.getElementById('yt-error');
    const previewEl = document.getElementById('yt-preview');
    const thumbEl = document.getElementById('yt-thumb');
    const titleEl = document.getElementById('yt-title');
    const uploaderEl = document.getElementById('yt-uploader');
    const durationEl = document.getElementById('yt-duration');
    const downloadBtn = document.getElementById('yt-download');
    const progressContainer = document.getElementById('yt-progress');
    const progressFill = document.getElementById('yt-progress-fill');
    const progressText = document.getElementById('yt-progress-text');
    const completeEl = document.getElementById('yt-complete');
    const downloadLink = document.getElementById('yt-download-link');

    fetchBtn.addEventListener('click', fetchInfo);
    urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchInfo(); });
    downloadBtn.addEventListener('click', startDownload);

    async function fetchInfo() {
        const url = urlInput.value.trim();
        if (!url) return;

        hideError(errorEl);
        previewEl.classList.add('hidden');
        completeEl.classList.add('hidden');
        progressContainer.classList.add('hidden');
        loadingEl.classList.remove('hidden');
        fetchBtn.disabled = true;

        try {
            const resp = await fetch(`/api/youtube/info?url=${encodeURIComponent(url)}`);
            const data = await resp.json();

            if (data.error) {
                showError(errorEl, data.error);
                return;
            }

            thumbEl.src = data.thumbnail || '';
            titleEl.textContent = data.title || '';
            uploaderEl.textContent = data.uploader || '';
            durationEl.textContent = formatDuration(data.duration);
            previewEl.classList.remove('hidden');
        } catch (e) {
            showError(errorEl, 'Failed to fetch video info');
        } finally {
            loadingEl.classList.add('hidden');
            fetchBtn.disabled = false;
        }
    }

    async function startDownload() {
        const url = urlInput.value.trim();
        const quality = document.querySelector('input[name="quality"]:checked').value;

        hideError(errorEl);
        completeEl.classList.add('hidden');
        downloadBtn.disabled = true;
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        progressContainer.classList.remove('hidden');

        try {
            const resp = await fetch('/api/youtube/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, quality }),
            });
            const data = await resp.json();

            if (data.error) {
                showError(errorEl, data.error);
                progressContainer.classList.add('hidden');
                downloadBtn.disabled = false;
                return;
            }

            pollProgress(
                data.task_id,
                progressFill,
                progressText,
                filename => {
                    downloadLink.href = `/api/downloads/youtube/${encodeURIComponent(filename)}`;
                    downloadLink.textContent = filename;
                    completeEl.classList.remove('hidden');
                    downloadBtn.disabled = false;
                },
                err => {
                    showError(errorEl, err);
                    downloadBtn.disabled = false;
                }
            );
        } catch {
            showError(errorEl, 'Failed to start download');
            progressContainer.classList.add('hidden');
            downloadBtn.disabled = false;
        }
    }
})();
