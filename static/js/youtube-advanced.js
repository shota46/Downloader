// YouTube Advanced - server.py (FastAPI :8765) 連携
(function () {
  const YTDL_WS_URL = `ws://${location.hostname}:8765/ws`;
  let ws = null;
  let wsReconnectTimer = null;

  // ── WebSocket ──────────────────────────────────────────
  function connectWS() {
    if (ws && ws.readyState <= 1) return;
    try {
      ws = new WebSocket(YTDL_WS_URL);
    } catch { return; }

    ws.onopen = () => {
      const el = document.getElementById('ytdl-ws-status');
      if (el) { el.textContent = 'WS: 接続中'; el.classList.add('connected'); }
      document.getElementById('ytdl-server-status')?.classList.remove('hidden');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === 'init') renderQueue(msg.tasks || []);
        if (msg.event === 'progress') updateTask(msg.task);
      } catch {}
    };

    ws.onclose = () => {
      const el = document.getElementById('ytdl-ws-status');
      if (el) { el.textContent = 'WS: 切断'; el.classList.remove('connected'); }
      clearTimeout(wsReconnectTimer);
      wsReconnectTimer = setTimeout(connectWS, 3000);
    };

    ws.onerror = () => ws.close();
  }

  // ── Queue rendering ────────────────────────────────────
  function renderQueue(tasks) {
    const container = document.getElementById('ytdl-queue-list');
    if (!container) return;
    if (!tasks.length) {
      container.innerHTML = '<div class="empty-state">キューは空です</div>';
      return;
    }
    container.innerHTML = tasks.map(t => taskHTML(t)).join('');
  }

  function updateTask(task) {
    const el = document.getElementById(`ytdl-task-${task.id}`);
    if (el) {
      el.outerHTML = taskHTML(task);
    } else {
      const container = document.getElementById('ytdl-queue-list');
      if (container) {
        const empty = container.querySelector('.empty-state');
        if (empty) empty.remove();
        container.insertAdjacentHTML('afterbegin', taskHTML(task));
      }
    }
  }

  function taskHTML(t) {
    const statusLabel = {
      pending: '待機中', downloading: 'DL中', converting: '変換中',
      tagging: 'メタデータ', done: '完了', error: 'エラー', paused: '停止',
    }[t.status] || t.status;

    return `
      <div class="queue-item status-${t.status}" id="ytdl-task-${t.id}">
        <div class="queue-item-header">
          ${t.thumbnail ? `<img src="${t.thumbnail}" class="queue-thumb" alt="">` : ''}
          <div class="queue-item-info">
            <div class="queue-title">${t.title || '取得中...'}</div>
            <div class="queue-meta">${t.channel || ''} | ${t.format || ''} | ${t.size || ''}</div>
          </div>
          <span class="queue-status">${statusLabel}</span>
        </div>
        ${['downloading','converting','tagging'].includes(t.status) ? `
          <div class="progress-container">
            <div class="progress-bar"><div class="progress-fill" style="width:${t.progress}%"></div></div>
            <span class="progress-text">${Math.round(t.progress)}%</span>
            ${t.speed && t.speed !== '—' ? `<span class="queue-speed">${t.speed}</span>` : ''}
          </div>
        ` : ''}
        ${t.status === 'error' ? `<div class="error">${t.error_msg || 'Unknown error'}</div>` : ''}
      </div>
    `;
  }

  // ── Fetch info ─────────────────────────────────────────
  const fetchBtn = document.getElementById('ytdl-fetch');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      const url = document.getElementById('ytdl-url').value.trim();
      if (!url) return;

      const loading = document.getElementById('ytdl-loading');
      const errorEl = document.getElementById('ytdl-error');
      const preview = document.getElementById('ytdl-preview');

      loading.classList.remove('hidden');
      errorEl.classList.add('hidden');
      preview.classList.add('hidden');

      try {
        const resp = await fetch(`/api/ytdl/info?url=${encodeURIComponent(url)}`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || data.detail || 'Failed');

        document.getElementById('ytdl-thumb').src = data.thumbnail || '';
        document.getElementById('ytdl-title').textContent = data.title || '';
        document.getElementById('ytdl-channel').textContent = data.channel || '';
        document.getElementById('ytdl-duration').textContent = data.duration ? formatDuration(data.duration) : '';
        document.getElementById('ytdl-date').textContent = data.upload_date || '';

        preview.classList.remove('hidden');
      } catch (e) {
        showError(errorEl, e.message);
      } finally {
        loading.classList.add('hidden');
      }
    });
  }

  // ── Download ───────────────────────────────────────────
  const dlBtn = document.getElementById('ytdl-download');
  if (dlBtn) {
    dlBtn.addEventListener('click', async () => {
      const url = document.getElementById('ytdl-url').value.trim();
      if (!url) return;

      const quality = document.querySelector('input[name="ytdl-quality"]:checked')?.value || '1080p';
      const embedMeta = document.getElementById('ytdl-embed-meta')?.checked ?? true;
      const embedThumb = document.getElementById('ytdl-embed-thumb')?.checked ?? true;

      const errorEl = document.getElementById('ytdl-error');
      errorEl.classList.add('hidden');

      try {
        const resp = await fetch('/api/ytdl/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, format: quality, embed_meta: embedMeta, embed_thumb: embedThumb }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || data.detail || 'Failed');
      } catch (e) {
        showError(errorEl, e.message);
      }
    });
  }

  // ── Refresh queue via REST fallback ────────────────────
  async function refreshQueue() {
    try {
      const resp = await fetch('/api/ytdl/queue');
      if (resp.ok) renderQueue(await resp.json());
    } catch {}
  }

  // ── Auto-connect WS when tab shown ────────────────────
  document.addEventListener('tabchange', (e) => {
    if (e.detail === 'ytdl') { connectWS(); refreshQueue(); }
  });
})();
