(function () {
    const searchInput = document.getElementById('anime-search-input');
    const searchBtn = document.getElementById('anime-search-btn');
    const loadingEl = document.getElementById('anime-loading');
    const errorEl = document.getElementById('anime-error');
    const resultsEl = document.getElementById('anime-results');
    const detailEl = document.getElementById('anime-detail');
    const detailContent = document.getElementById('anime-detail-content');
    const episodesEl = document.getElementById('anime-episodes');
    const backBtn = document.getElementById('anime-back');
    const streamEl = document.getElementById('anime-stream');
    const streamContent = document.getElementById('anime-stream-content');
    const streamBackBtn = document.getElementById('anime-stream-back');
    const streamProgress = document.getElementById('anime-stream-progress');
    const progressFill = document.getElementById('anime-progress-fill');
    const progressText = document.getElementById('anime-progress-text');
    const streamComplete = document.getElementById('anime-stream-complete');
    const animeDownloadLink = document.getElementById('anime-download-link');

    let currentAnimeId = null;

    searchBtn.addEventListener('click', () => searchAnime());
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchAnime(); });
    backBtn.addEventListener('click', showSearchResults);
    streamBackBtn.addEventListener('click', () => {
        streamEl.classList.add('hidden');
        detailEl.classList.remove('hidden');
    });

    async function searchAnime(page = 1) {
        const keyword = searchInput.value.trim();
        if (!keyword) return;

        hideError(errorEl);
        loadingEl.classList.remove('hidden');
        resultsEl.innerHTML = '';
        detailEl.classList.add('hidden');
        streamEl.classList.add('hidden');
        resultsEl.classList.remove('hidden');
        searchBtn.disabled = true;

        try {
            const resp = await fetch(`/api/anime/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
            const data = await resp.json();

            if (data.error) {
                showError(errorEl, data.error);
                return;
            }

            const results = data.data?.response || data.data?.animes || [];
            if (results.length === 0) {
                resultsEl.innerHTML = '<div class="empty-state">結果が見つかりませんでした</div>';
                return;
            }

            resultsEl.innerHTML = results.map(anime => `
                <div class="anime-card" data-id="${anime.id}">
                    <img src="${anime.poster || ''}" alt="${anime.name || ''}" loading="lazy">
                    <div class="card-info">
                        <div class="card-title">${anime.name || anime.jname || ''}</div>
                        <div class="card-meta">${anime.type || ''} ${anime.duration || ''}</div>
                    </div>
                </div>
            `).join('');

            resultsEl.querySelectorAll('.anime-card').forEach(card => {
                card.addEventListener('click', () => showAnimeDetail(card.dataset.id));
            });
        } catch {
            showError(errorEl, 'Anime APIに接続できません');
        } finally {
            loadingEl.classList.add('hidden');
            searchBtn.disabled = false;
        }
    }

    async function showAnimeDetail(animeId) {
        currentAnimeId = animeId;
        hideError(errorEl);
        resultsEl.classList.add('hidden');
        streamEl.classList.add('hidden');
        loadingEl.classList.remove('hidden');

        try {
            const [infoResp, epsResp] = await Promise.all([
                fetch(`/api/anime/info/${animeId}`),
                fetch(`/api/anime/episodes/${animeId}`),
            ]);
            const info = await infoResp.json();
            const eps = await epsResp.json();

            if (info.error) { showError(errorEl, info.error); return; }

            const anime = info.data?.anime || info.data || {};
            const moreInfo = anime.moreInfo || {};

            detailContent.innerHTML = `
                <img src="${anime.poster || ''}" alt="${anime.name || ''}">
                <div class="detail-info">
                    <h2>${anime.name || ''}</h2>
                    <div class="detail-meta">${anime.jname || ''}</div>
                    <div class="detail-meta">${moreInfo.status || ''} | ${moreInfo.aired || ''} | ${moreInfo.genres?.join(', ') || ''}</div>
                    <div class="detail-desc">${anime.description || ''}</div>
                </div>
            `;

            const episodes = eps.data?.episodes || eps.data || [];
            episodesEl.innerHTML = episodes.map(ep => `
                <button class="episode-btn" data-id="${ep.id}" data-title="${(anime.name || '') + ' EP' + (ep.number || ep.episode_no || '')}">${ep.number || ep.episode_no || ep.title || ''}</button>
            `).join('');

            episodesEl.querySelectorAll('.episode-btn').forEach(btn => {
                btn.addEventListener('click', () => showEpisodeStream(btn.dataset.id, btn.dataset.title));
            });

            detailEl.classList.remove('hidden');
        } catch {
            showError(errorEl, 'アニメ情報の取得に失敗しました');
        } finally {
            loadingEl.classList.add('hidden');
        }
    }

    async function showEpisodeStream(episodeId, title) {
        detailEl.classList.add('hidden');
        hideError(errorEl);
        loadingEl.classList.remove('hidden');
        streamComplete.classList.add('hidden');
        streamProgress.classList.add('hidden');

        try {
            const serversResp = await fetch(`/api/anime/servers/${episodeId}`);
            const serversData = await serversResp.json();

            const sub = serversData.data?.sub || [];
            const dub = serversData.data?.dub || [];

            let html = `<h3>${title}</h3>`;

            if (sub.length > 0) {
                html += '<p style="margin-top:1rem;color:var(--text-secondary)">Sub</p><div class="server-buttons">';
                sub.forEach(s => {
                    html += `<button class="server-btn" data-ep="${episodeId}" data-server="${s.name}" data-type="sub" data-title="${title}">${s.name}</button>`;
                });
                html += '</div>';
            }

            if (dub.length > 0) {
                html += '<p style="margin-top:0.5rem;color:var(--text-secondary)">Dub</p><div class="server-buttons">';
                dub.forEach(s => {
                    html += `<button class="server-btn" data-ep="${episodeId}" data-server="${s.name}" data-type="dub" data-title="${title}">${s.name}</button>`;
                });
                html += '</div>';
            }

            html += '<div id="stream-result"></div>';
            streamContent.innerHTML = html;

            streamContent.querySelectorAll('.server-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    streamContent.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    getStream(btn.dataset.ep, btn.dataset.server, btn.dataset.type, btn.dataset.title);
                });
            });

            streamEl.classList.remove('hidden');
        } catch {
            showError(errorEl, 'サーバー情報の取得に失敗しました');
            detailEl.classList.remove('hidden');
        } finally {
            loadingEl.classList.add('hidden');
        }
    }

    async function getStream(episodeId, server, type, title) {
        const resultEl = document.getElementById('stream-result');
        resultEl.innerHTML = '<div class="loading">ストリーム取得中...</div>';
        streamComplete.classList.add('hidden');
        streamProgress.classList.add('hidden');

        try {
            const resp = await fetch(`/api/anime/stream?id=${encodeURIComponent(episodeId)}&server=${server}&type=${type}`);
            const data = await resp.json();

            if (data.error) {
                resultEl.innerHTML = `<div class="error">${data.error}</div>`;
                return;
            }

            const streamData = data.data || {};
            const sources = streamData.sources || [];
            const tracks = streamData.tracks || [];

            if (sources.length === 0) {
                resultEl.innerHTML = '<div class="error">ストリームが見つかりませんでした</div>';
                return;
            }

            const hlsUrl = sources[0].url || sources[0].file || '';

            let html = '<div class="stream-actions">';
            html += `<a class="stream-link" href="${hlsUrl}" target="_blank" rel="noopener">M3U8リンクをコピー</a>`;
            html += `<button class="btn-primary" id="anime-dl-btn">ダウンロード (MP4)</button>`;
            html += '</div>';

            if (tracks.length > 0) {
                html += '<p style="margin-top:0.5rem;color:var(--text-secondary);font-size:0.8rem">字幕: ';
                html += tracks.filter(t => t.kind === 'captions').map(t => t.label || t.language || '').join(', ');
                html += '</p>';
            }

            resultEl.innerHTML = html;

            document.getElementById('anime-dl-btn').addEventListener('click', () => {
                startAnimeDownload(hlsUrl, title);
            });
        } catch {
            resultEl.innerHTML = '<div class="error">ストリームの取得に失敗しました</div>';
        }
    }

    async function startAnimeDownload(hlsUrl, filename) {
        streamComplete.classList.add('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        streamProgress.classList.remove('hidden');

        try {
            const resp = await fetch('/api/anime/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: hlsUrl, filename }),
            });
            const data = await resp.json();

            if (data.error) {
                showError(errorEl, data.error);
                streamProgress.classList.add('hidden');
                return;
            }

            pollProgress(
                data.task_id,
                progressFill,
                progressText,
                fname => {
                    animeDownloadLink.href = `/api/downloads/anime/${encodeURIComponent(fname)}`;
                    animeDownloadLink.textContent = fname;
                    streamComplete.classList.remove('hidden');
                },
                err => {
                    showError(errorEl, err);
                }
            );
        } catch {
            showError(errorEl, 'ダウンロードの開始に失敗しました');
            streamProgress.classList.add('hidden');
        }
    }

    function showSearchResults() {
        detailEl.classList.add('hidden');
        streamEl.classList.add('hidden');
        resultsEl.classList.remove('hidden');
    }
})();
