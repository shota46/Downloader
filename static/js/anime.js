(function () {
    // ─── DOM Elements ───────────────────────────────────────────────────────
    const els = {
        searchInput: document.getElementById('anime-search-input'),
        searchBtn: document.getElementById('anime-search-btn'),
        loading: document.getElementById('anime-loading'),
        error: document.getElementById('anime-error'),
        results: document.getElementById('anime-results'),
        detail: document.getElementById('anime-detail'),
        detailContent: document.getElementById('anime-detail-content'),
        episodes: document.getElementById('anime-episodes'),
        backBtn: document.getElementById('anime-back'),
        stream: document.getElementById('anime-stream'),
        streamContent: document.getElementById('anime-stream-content'),
        streamBackBtn: document.getElementById('anime-stream-back'),
        streamProgress: document.getElementById('anime-stream-progress'),
        progressFill: document.getElementById('anime-progress-fill'),
        progressText: document.getElementById('anime-progress-text'),
        streamComplete: document.getElementById('anime-stream-complete'),
        downloadLink: document.getElementById('anime-download-link'),
    };

    // ─── Utilities ───────────────────────────────────────────────────────────
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

    // ─── Event Listeners ─────────────────────────────────────────────────────
    els.searchBtn?.addEventListener('click', () => searchAnime());
    els.searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') searchAnime(); });
    els.backBtn?.addEventListener('click', showSearchResults);
    els.streamBackBtn?.addEventListener('click', () => {
        hideEl(els.stream);
        showEl(els.detail);
    });

    // ─── Search ──────────────────────────────────────────────────────────────
    async function searchAnime(page = 1) {
        const keyword = els.searchInput?.value.trim();
        if (!keyword) return;

        hideError();
        showEl(els.loading);
        els.results.innerHTML = '';
        hideEl(els.detail);
        hideEl(els.stream);
        showEl(els.results);
        els.searchBtn.disabled = true;

        try {
            const resp = await fetch(`/api/anime/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
            const data = await resp.json();

            if (data.error) {
                showError(data.error);
                return;
            }

            const results = data.results || data.data?.response || data.data?.animes || [];
            if (!results.length) {
                els.results.innerHTML = '<div class="empty-state">結果が見つかりませんでした</div>';
                return;
            }

            els.results.innerHTML = results.map(anime => `
                <div class="anime-card" data-id="${escapeHtml(anime.id)}">
                    <img src="${escapeHtml(anime.image || anime.poster || '')}" alt="${escapeHtml(anime.title || anime.name || '')}" loading="lazy">
                    <div class="card-info">
                        <div class="card-title">${escapeHtml(anime.title || anime.name || anime.japaneseTitle || '')}</div>
                        <div class="card-meta">${escapeHtml(anime.type || '')} ${anime.episodes ? `EP ${anime.episodes}` : ''}</div>
                    </div>
                </div>
            `).join('');

            els.results.querySelectorAll('.anime-card').forEach(card => {
                card.addEventListener('click', () => showAnimeDetail(card.dataset.id));
            });
        } catch {
            showError('Anime APIに接続できません');
        } finally {
            hideEl(els.loading);
            els.searchBtn.disabled = false;
        }
    }

    // ─── Anime Detail ────────────────────────────────────────────────────────
    async function showAnimeDetail(animeId) {
        hideError();
        hideEl(els.results);
        hideEl(els.stream);
        showEl(els.loading);

        try {
            const resp = await fetch(`/api/anime/info/${encodeURIComponent(animeId)}`);
            const anime = await resp.json();

            if (anime.error) {
                showError(anime.error);
                return;
            }

            const title = anime.title || anime.name || '';
            const image = anime.image || anime.poster || '';
            const description = anime.description || '';
            const episodes = anime.episodes || [];

            els.detailContent.innerHTML = `
                <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">
                <div class="detail-info">
                    <h2>${escapeHtml(title)}</h2>
                    <div class="detail-meta">${escapeHtml(anime.japaneseTitle || anime.jname || '')}</div>
                    <div class="detail-meta">${escapeHtml(anime.type || '')} | ${escapeHtml(anime.duration || '')} | ${escapeHtml(anime.status || '')}</div>
                    <div class="detail-desc">${escapeHtml(description)}</div>
                </div>
            `;

            if (!episodes.length) {
                els.episodes.innerHTML = '<div class="empty-state">エピソードが見つかりません</div>';
            } else {
                els.episodes.innerHTML = episodes.map(ep => `
                    <button class="episode-btn" data-id="${escapeHtml(ep.id)}" data-title="${escapeHtml(title)} EP${ep.number || ''}">${ep.number || ep.title || ''}</button>
                `).join('');

                els.episodes.querySelectorAll('.episode-btn').forEach(btn => {
                    btn.addEventListener('click', () => showEpisodeStream(btn.dataset.id, btn.dataset.title));
                });
            }

            showEl(els.detail);
        } catch {
            showError('アニメ情報の取得に失敗しました');
        } finally {
            hideEl(els.loading);
        }
    }

    // ─── Episode Stream ──────────────────────────────────────────────────────
    async function showEpisodeStream(episodeId, title) {
        hideEl(els.detail);
        hideError();
        showEl(els.loading);
        hideEl(els.streamComplete);
        hideEl(els.streamProgress);

        try {
            const resp = await fetch(`/api/anime/stream?id=${encodeURIComponent(episodeId)}`);
            const data = await resp.json();

            if (data.error) {
                showError(data.error);
                showEl(els.detail);
                return;
            }

            const sources = data.data?.sources || [];
            const downloads = data.data?.download || [];
            const headers = data.data?.headers || {};

            if (!sources.length && !downloads.length) {
                showError('ストリームが見つかりませんでした');
                showEl(els.detail);
                return;
            }

            // Prefer direct download URLs if available
            const downloadUrl = downloads.length > 0 ? downloads[0].url : null;
            const hlsUrl = sources.length > 0 ? sources[0].url : null;
            const referer = headers.Referer || 'https://kwik.cx/';

            let html = `<h3>${escapeHtml(title)}</h3>`;

            // Quality selector if multiple options
            if (downloads.length > 1) {
                html += '<div class="quality-selector" style="margin:1rem 0">';
                downloads.forEach((d, i) => {
                    const checked = i === 0 ? 'checked' : '';
                    html += `<label><input type="radio" name="anime-quality" value="${i}" ${checked}> ${escapeHtml(d.quality)}</label>`;
                });
                html += '</div>';
            } else if (sources.length > 1) {
                html += '<div class="quality-selector" style="margin:1rem 0">';
                sources.forEach((s, i) => {
                    const checked = i === 0 ? 'checked' : '';
                    html += `<label><input type="radio" name="anime-quality" value="${i}" ${checked}> ${escapeHtml(s.quality)}</label>`;
                });
                html += '</div>';
            }

            html += '<div class="stream-actions" style="margin-top:1rem">';
            html += `<button class="btn-primary" id="anime-dl-btn">ダウンロード (MP4)</button>`;
            html += '</div>';
            html += '<div id="stream-result"></div>';

            els.streamContent.innerHTML = html;

            // Store data for download
            els.streamContent.dataset.downloads = JSON.stringify(downloads);
            els.streamContent.dataset.sources = JSON.stringify(sources);
            els.streamContent.dataset.referer = referer;

            document.getElementById('anime-dl-btn')?.addEventListener('click', () => {
                const qualityIndex = document.querySelector('input[name="anime-quality"]:checked')?.value || '0';
                const idx = parseInt(qualityIndex);
                const dl = downloads[idx] || downloads[0];
                const src = sources[idx] || sources[0];

                // Prefer direct download URL
                if (dl?.url) {
                    directDownload(dl.url, title, referer);
                } else if (src?.url) {
                    startAnimeDownload(src.url, title, referer);
                }
            });

            showEl(els.stream);
        } catch {
            showError('ストリームの取得に失敗しました');
            showEl(els.detail);
        } finally {
            hideEl(els.loading);
        }
    }

    // Direct download (MP4)
    async function directDownload(url, filename, referer) {
        const safeName = (filename || 'anime').replace(/[^\w\s\-.]/g, '').trim() + '.mp4';
        els.progressFill.style.width = '0%';
        els.progressText.textContent = '準備中...';
        showEl(els.streamProgress);

        try {
            const resp = await fetch('/api/anime/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, filename: safeName, referer }),
            });
            const data = await resp.json();

            if (data.error) {
                showError(data.error);
                hideEl(els.streamProgress);
                return;
            }

            pollProgress(
                data.task_id,
                els.progressFill,
                els.progressText,
                fname => {
                    els.downloadLink.href = `/api/downloads/anime/${encodeURIComponent(fname)}`;
                    els.downloadLink.textContent = fname;
                    showEl(els.streamComplete);
                },
                err => showError(err)
            );
        } catch {
            showError('ダウンロードの開始に失敗しました');
            hideEl(els.streamProgress);
        }
    }

    // ─── Download ────────────────────────────────────────────────────────────
    async function startAnimeDownload(hlsUrl, filename, referer) {
        const safeName = (filename || 'anime').replace(/[^\w\s\-.]/g, '').trim() + '.mp4';
        hideEl(els.streamComplete);
        els.progressFill.style.width = '0%';
        els.progressText.textContent = '0%';
        showEl(els.streamProgress);

        try {
            const resp = await fetch('/api/anime/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: hlsUrl, filename: safeName, referer }),
            });
            const data = await resp.json();

            if (data.error) {
                showError(data.error);
                hideEl(els.streamProgress);
                return;
            }

            pollProgress(
                data.task_id,
                els.progressFill,
                els.progressText,
                fname => {
                    els.downloadLink.href = `/api/downloads/anime/${encodeURIComponent(fname)}`;
                    els.downloadLink.textContent = fname;
                    showEl(els.streamComplete);
                },
                err => showError(err)
            );
        } catch {
            showError('ダウンロードの開始に失敗しました');
            hideEl(els.streamProgress);
        }
    }

    // ─── Navigation ──────────────────────────────────────────────────────────
    function showSearchResults() {
        hideEl(els.detail);
        hideEl(els.stream);
        showEl(els.results);
    }
})();
