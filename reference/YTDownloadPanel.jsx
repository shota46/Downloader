import { useState, useEffect, useRef } from "react";

// ── モックデータ ──────────────────────────────────────────────────────────────
const MOCK_QUEUE = [
  { id:"1", title:"【ゆっくり解説】宇宙の謎を徹底解説", channel:"サイエンスチャンネル", episode:"単話", quality:"1080p", status:"tagging",     progress:97, speed:"—",       eta:"—",   size:"380 MB", thumbnail:"https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg", meta_written:false },
  { id:"2", title:"React 18 完全入門講座【2024年版】",  channel:"コードアカデミー",     episode:"1-12", quality:"720p",  status:"downloading", progress:42, speed:"3.8 MB/s", eta:"4:21", size:"1.2 GB",  thumbnail:null, meta_written:false },
  { id:"3", title:"Lo-fi Hip Hop Mix 2024",             channel:"ChillBeats",           episode:"単話", quality:"mp3",   status:"done",        progress:100,speed:"—",        eta:"—",   size:"42 MB",   thumbnail:null, meta_written:false },
  { id:"4", title:"【Vlog】東京街歩き 2024",             channel:"TravelJapan",          episode:"単話", quality:"1080p", status:"done",        progress:100,speed:"—",        eta:"—",   size:"520 MB",  thumbnail:null, meta_written:true  },
];

const MOCK_FOLDERS = [
  {
    id:"folder-1", name:"サイエンスチャンネル", fileCount:8, totalSize:"2.9 GB", date:"2026-03-10",
    files:[
      { id:"f1a", title:"【ゆっくり解説】宇宙の謎を徹底解説", quality:"1080p", size:"380 MB", date:"2026-03-10", ext:"mp4", meta_written:true,  upload_date:"20240315", description:"宇宙の謎について", url:"https://youtube.com/watch?v=aaa" },
      { id:"f1b", title:"ブラックホールの真実",               quality:"1080p", size:"410 MB", date:"2026-03-09", ext:"mp4", meta_written:true,  upload_date:"20240310", description:"ブラックホールとは", url:"https://youtube.com/watch?v=bbb" },
      { id:"f1c", title:"量子力学入門",                       quality:"720p",  size:"290 MB", date:"2026-03-08", ext:"mp4", meta_written:false, upload_date:"20240305", description:"量子力学基礎",      url:"https://youtube.com/watch?v=ccc" },
      { id:"f1d", title:"相対性理論をわかりやすく",           quality:"1080p", size:"460 MB", date:"2026-03-07", ext:"mp4", meta_written:true,  upload_date:"20240301", description:"相対性理論解説",    url:"https://youtube.com/watch?v=ddd" },
      { id:"f1e", title:"宇宙の大きさとは",                   quality:"720p",  size:"310 MB", date:"2026-03-06", ext:"mp4", meta_written:false, upload_date:"20240220", description:"宇宙の広さを解説",  url:"https://youtube.com/watch?v=eee" },
    ]
  },
  {
    id:"folder-2", name:"コードアカデミー", fileCount:6, totalSize:"725 MB", date:"2026-03-10",
    files:[
      { id:"f2a", title:"React 18 完全入門 #01", quality:"720p", size:"95 MB",  date:"2026-03-10", ext:"mp4", meta_written:true,  upload_date:"20240201", description:"React入門 第1回", url:"https://youtube.com/watch?v=r01" },
      { id:"f2b", title:"React 18 完全入門 #02", quality:"720p", size:"88 MB",  date:"2026-03-10", ext:"mp4", meta_written:true,  upload_date:"20240205", description:"React入門 第2回", url:"https://youtube.com/watch?v=r02" },
      { id:"f2c", title:"TypeScript入門 完全版", quality:"480p", size:"210 MB", date:"2026-03-07", ext:"mp4", meta_written:false, upload_date:"20240110", description:"TS入門",          url:"https://youtube.com/watch?v=ts1" },
    ]
  },
  {
    id:"folder-3", name:"ChillBeats", fileCount:3, totalSize:"115 MB", date:"2026-03-09",
    files:[
      { id:"f3a", title:"Lo-fi Hip Hop Mix 2024", quality:"mp3", size:"42 MB", date:"2026-03-09", ext:"mp3", meta_written:true,  upload_date:"20240301", description:"Lofi mix", url:"https://youtube.com/watch?v=lo1" },
      { id:"f3b", title:"Chill Study Beats Vol.2",quality:"mp3", size:"38 MB", date:"2026-03-08", ext:"mp3", meta_written:false, upload_date:"20240220", description:"Study music", url:"https://youtube.com/watch?v=lo2" },
    ]
  },
];

const STATUS_META = {
  downloading:{ label:"ダウンロード中",  color:"#ff3b3b", icon:"⬇" },
  pending:    { label:"待機中",          color:"#78909c", icon:"⏳" },
  converting: { label:"変換中",          color:"#ffa726", icon:"⚙"  },
  tagging:    { label:"メタデータ書込中", color:"#ab47bc", icon:"🏷"  },
  done:       { label:"完了",            color:"#4caf50", icon:"✓"  },
  error:      { label:"エラー",          color:"#ef5350", icon:"✕"  },
  paused:     { label:"一時停止",        color:"#78909c", icon:"⏸"  },
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0a0a0a;--bg2:#111;--bg3:#181818;--bg4:#202020;--bg5:#262626;
    --border:#252525;--border2:#303030;--border3:#3a3a3a;
    --yt:#ff0000;--yt-soft:#ff3b3b;--yt-dim:rgba(255,0,0,.12);
    --amber:#ffa726;--green:#4caf50;--blue:#2196f3;--blue-dim:rgba(33,150,243,.12);
    --purple:#9c27b0;--purple-dim:rgba(156,39,176,.15);
    --teal:#00bcd4;--teal-dim:rgba(0,188,212,.12);
    --red:#ef5350;--text:#e8e8e8;--text2:#888;--text3:#444;
    --mono:'DM Mono',monospace;--sans:'DM Sans',sans-serif;
  }
  html,body,#root{height:100%;background:var(--bg);color:var(--text);font-family:var(--sans)}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

  .layout{display:grid;grid-template-rows:52px 1fr;grid-template-columns:200px 1fr;height:100vh;overflow:hidden}
  .topbar{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:0 20px;background:var(--bg2);border-bottom:1px solid var(--border)}
  .logo{display:flex;align-items:center;gap:9px;font-weight:600;font-size:15px;letter-spacing:-.02em}
  .yt-badge{width:28px;height:20px;background:var(--yt);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .yt-badge::after{content:'';border-left:9px solid white;border-top:5px solid transparent;border-bottom:5px solid transparent;margin-left:2px}
  .sp{flex:1}
  .chip{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;background:var(--bg3);border:1px solid var(--border);font-family:var(--mono);font-size:11px;color:var(--text2)}
  .chip .v{color:var(--text);font-weight:500}.chip .warn{color:var(--amber)}.chip .ok{color:var(--green)}.chip .dl{color:var(--yt-soft)}

  .sidebar{background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto}
  .nav{display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;font-size:13px;color:var(--text2);border-left:2px solid transparent;transition:all .12s;user-select:none}
  .nav:hover{background:var(--bg3);color:var(--text)}.nav.on{background:var(--bg3);color:var(--yt-soft);border-left-color:var(--yt)}
  .ni{font-size:15px;width:20px;text-align:center}
  .nbadge{margin-left:auto;background:var(--yt);color:#fff;font-family:var(--mono);font-size:10px;padding:1px 6px;border-radius:3px;font-weight:500}
  .sfooter{margin-top:auto;padding:12px;border-top:1px solid var(--border)}
  .spill{display:flex;align-items:center;gap:7px;padding:7px 11px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;font-family:var(--mono);font-size:11px;color:var(--text2)}
  .dot-g{width:6px;height:6px;background:var(--green);border-radius:50%;box-shadow:0 0 5px var(--green);flex-shrink:0;animation:blink 1.8s infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

  .main{overflow-y:auto;padding:22px 26px;background:radial-gradient(ellipse 50% 30% at 90% 0%,rgba(255,0,0,.04) 0%,transparent 60%),var(--bg)}
  .phd{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:var(--text);margin-bottom:18px}
  .phd::after{content:'';flex:1;height:1px;background:var(--border)}

  .sgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px}
  .sc{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px 16px}
  .sc.acc{border-color:rgba(255,0,0,.3);background:rgba(255,0,0,.04)}
  .sl{font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
  .sv{font-family:var(--mono);font-size:24px;font-weight:500}.sv.r{color:var(--yt-soft)}
  .ss2{font-size:11px;color:var(--text2);margin-top:3px}

  .card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:18px 20px;margin-bottom:14px}
  .clabel{font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}

  .frow{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
  .ig{display:flex;flex-direction:column;gap:5px;flex:1;min-width:160px}
  .ig label{font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em}
  .ifield{background:var(--bg3);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:9px 12px;font-size:13px;font-family:var(--sans);outline:none;transition:border .12s;appearance:none;width:100%}
  .ifield:focus{border-color:var(--yt)}.ifield::placeholder{color:var(--text3)}
  select.ifield option{background:var(--bg3)}
  textarea.ifield{resize:vertical;min-height:80px;line-height:1.5}
  .uiwrap{position:relative}.uiwrap .ifield{padding-right:90px}
  .upbtn{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:var(--bg4);border:1px solid var(--border2);color:var(--text2);font-size:11px;font-family:var(--mono);padding:4px 10px;border-radius:4px;cursor:pointer;transition:all .12s}
  .upbtn:hover{color:var(--text);border-color:var(--text3)}

  .btn{padding:9px 18px;border:none;border-radius:6px;font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;transition:all .12s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
  .btn-yt{background:var(--yt);color:#fff}.btn-yt:hover{background:#cc0000;transform:translateY(-1px);box-shadow:0 4px 20px rgba(255,0,0,.25)}
  .btn-yt:disabled{background:#333;cursor:not-allowed;transform:none;box-shadow:none;color:#555}
  .btn-g{background:transparent;border:1px solid var(--border2);color:var(--text2)}.btn-g:hover{border-color:var(--text2);color:var(--text)}
  .btn-d{background:transparent;border:1px solid rgba(239,83,80,.4);color:var(--red)}.btn-d:hover{background:rgba(239,83,80,.08)}
  .btn-blue{background:var(--blue);color:#fff}.btn-blue:hover{background:#1976d2;transform:translateY(-1px);box-shadow:0 4px 20px rgba(33,150,243,.25)}
  .btn-purple{background:var(--purple);color:#fff}.btn-purple:hover{background:#7b1fa2;transform:translateY(-1px)}
  .btn-teal{background:var(--teal);color:#000;font-weight:600}.btn-teal:hover{background:#0097a7;color:#fff;transform:translateY(-1px)}
  .btn-amber{background:var(--amber);color:#000;font-weight:600}.btn-amber:hover{background:#f57c00;transform:translateY(-1px)}
  .btn-s{padding:5px 11px;font-size:12px}.btn-xs{padding:3px 8px;font-size:11px;border-radius:4px}

  .fmtgrid{display:flex;gap:8px;flex-wrap:wrap}
  .fmtbtn{padding:7px 16px;border-radius:5px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);cursor:pointer;font-family:var(--mono);font-size:12px;transition:all .12s}
  .fmtbtn:hover{border-color:var(--yt);color:var(--yt-soft)}.fmtbtn.sel{background:rgba(255,0,0,.1);border-color:var(--yt);color:var(--yt-soft)}
  .fmtsep{align-self:center;color:var(--border2);font-size:16px}

  /* QUEUE */
  .qi{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:10px;transition:border-color .12s;display:flex;gap:14px}
  .qi:hover{border-color:var(--border2)}
  .qthumb{width:88px;height:50px;border-radius:5px;background:var(--bg4);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center}
  .qthumb img{width:100%;height:100%;object-fit:cover}.qthp{font-size:24px;color:var(--text3)}
  .qbody{flex:1;min-width:0}
  .qtop{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px}
  .qtitle{font-size:13px;font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .qch{font-size:11px;color:var(--text2);margin-top:2px}
  .sbadge{padding:3px 8px;border-radius:4px;font-family:var(--mono);font-size:10px;font-weight:500;display:inline-flex;align-items:center;gap:4px;flex-shrink:0}
  .qtag{padding:2px 7px;border-radius:3px;font-family:var(--mono);font-size:10px}
  .qtag-f{background:var(--yt-dim);color:var(--yt-soft)}.qtag-s{background:rgba(255,255,255,.04);color:var(--text3)}
  .qtag-meta{background:var(--purple-dim);color:var(--purple)}.qtag-no-meta{background:rgba(255,255,255,.04);color:var(--text3)}
  .pt{height:3px;background:var(--bg4);border-radius:2px;overflow:hidden;margin-bottom:7px}
  .pf{height:100%;border-radius:2px;transition:width .6s ease}
  .qmeta{display:flex;gap:18px;font-family:var(--mono);font-size:11px;color:var(--text3)}
  .qmeta .v{color:var(--text2)}.qacts{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}

  /* FILES */
  .files-toolbar{display:flex;gap:10px;margin-bottom:14px;align-items:center;flex-wrap:wrap}
  .files-search{flex:1;min-width:200px}
  .ftbl{width:100%;border-collapse:collapse}
  .ftbl th{font-family:var(--mono);font-size:10px;color:var(--text3);text-align:left;padding:6px 12px;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
  .ftbl td{padding:9px 12px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle}
  .ftbl tr:last-child td{border-bottom:none}.ftbl tr:hover td{background:rgba(255,255,255,.02)}
  .ftbl tr.sel-row td{background:rgba(255,0,0,.04)}
  .ft{font-weight:500;white-space:nowrap;max-width:240px;overflow:hidden;text-overflow:ellipsis}
  .fc{font-size:11px;color:var(--text2);margin-top:2px}
  .cb{width:15px;height:15px;accent-color:var(--yt);cursor:pointer;flex-shrink:0}
  .meta-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;display:inline-block}
  .meta-dot.ok{background:var(--purple);box-shadow:0 0 5px var(--purple)}
  .meta-dot.no{background:var(--text3)}

  .bulk-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;margin-bottom:14px;background:rgba(255,0,0,.06);border:1px solid rgba(255,0,0,.25);border-radius:7px;font-size:13px;flex-wrap:wrap}
  .bulk-bar .count{font-family:var(--mono);color:var(--yt-soft);font-weight:500}

  /* FOLDERS */
  .folder-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:20px}
  .folder-card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;transition:border-color .15s,transform .15s}
  .folder-card:hover{border-color:var(--border3);transform:translateY(-2px)}.folder-card.open{border-color:rgba(255,165,0,.4)}
  .folder-header{padding:14px 16px;display:flex;align-items:center;gap:12px}
  .folder-icon{font-size:22px;flex-shrink:0}.folder-meta{flex:1;min-width:0}
  .folder-name{font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .folder-info{font-family:var(--mono);font-size:11px;color:var(--text2);margin-top:3px}
  .folder-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}
  .folder-files{border-top:1px solid var(--border);background:var(--bg3)}
  .folder-file-row{display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border);font-size:13px}
  .folder-file-row:last-child{border-bottom:none}.folder-file-row:hover{background:rgba(255,255,255,.02)}
  .ffr-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ffr-meta{font-family:var(--mono);font-size:11px;color:var(--text3);white-space:nowrap}
  .folder-sel-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;margin-bottom:14px;background:rgba(255,165,0,.06);border:1px solid rgba(255,165,0,.25);border-radius:7px;font-size:13px;flex-wrap:wrap}
  .folder-sel-bar .count{font-family:var(--mono);color:var(--amber);font-weight:500}

  /* ── METADATA MODAL ─────────────────────────────────── */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
  .modal{background:var(--bg2);border:1px solid var(--border2);border-radius:10px;width:100%;max-width:560px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6);animation:mopen .2s ease}
  @keyframes mopen{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
  .modal-hd{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);font-weight:600;font-size:14px;flex-shrink:0}
  .modal-body{padding:20px;overflow-y:auto;flex:1}
  .modal-ft{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--border);flex-shrink:0}
  .close-btn{background:none;border:none;color:var(--text2);font-size:18px;cursor:pointer;padding:4px;line-height:1}.close-btn:hover{color:var(--text)}

  /* メタデータフォーム内タグ表示 */
  .meta-tag-row{display:flex;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px}
  .meta-tag-row:last-child{border-bottom:none}
  .meta-tag-key{font-family:var(--mono);font-size:10px;color:var(--text3);width:110px;flex-shrink:0;text-transform:uppercase;letter-spacing:.06em}
  .meta-tag-val{flex:1;font-family:var(--mono);font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .meta-empty{color:var(--text3);font-style:italic}

  /* 現在のメタデータ読み取りパネル */
  .meta-read-panel{background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:14px;margin-bottom:16px}
  .meta-read-panel .head{font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
  .meta-status-badge{padding:2px 8px;border-radius:3px;font-family:var(--mono);font-size:10px}
  .meta-status-badge.ok{background:var(--purple-dim);color:var(--purple)}
  .meta-status-badge.no{background:rgba(255,255,255,.04);color:var(--text3)}

  /* SFTP Modal */
  .sftp-prog-wrap{margin-top:14px}
  .sftp-file-name{font-family:var(--mono);font-size:12px;color:var(--text2);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sftp-pt{height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:8px}
  .sftp-pf{height:100%;border-radius:3px;transition:width .3s ease;background:var(--blue)}
  .sftp-stats{display:flex;gap:16px;font-family:var(--mono);font-size:11px;color:var(--text2)}
  .sftp-stats .v{color:var(--text)}
  .sftp-log{background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:10px 12px;margin-top:12px;height:130px;overflow-y:auto;font-family:var(--mono);font-size:11px;color:var(--text2)}
  .sftp-log .ok{color:var(--green)}.sftp-log .err{color:var(--red)}.sftp-log .info{color:var(--blue)}

  /* SETTINGS */
  .setgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:700px){.setgrid{grid-template-columns:1fr}}
  .setcard h3{font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border)}
  .tr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px}
  .tr:last-child{border-bottom:none}
  .tog{width:36px;height:20px;background:var(--bg4);border-radius:10px;position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
  .tog.on{background:var(--yt)}.tog::after{content:'';position:absolute;left:3px;top:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:left .2s}.tog.on::after{left:19px}

  /* TOAST */
  .twrap{position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column;gap:8px;z-index:300}
  .toast{padding:10px 16px;border-radius:7px;background:var(--bg3);border:1px solid var(--border2);font-size:13px;display:flex;align-items:center;gap:8px;animation:tin .2s ease;box-shadow:0 8px 32px rgba(0,0,0,.5)}
  .toast.success{border-color:var(--green)}.toast.error{border-color:var(--red)}.toast.info{border-color:var(--blue)}.toast.meta{border-color:var(--purple)}
  @keyframes tin{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}

  .hint{background:rgba(255,165,0,.06);border:1px solid rgba(255,165,0,.2);border-radius:7px;padding:12px 16px;font-size:12px;color:var(--text2);margin-top:12px;display:flex;gap:10px;align-items:flex-start}
  .prev{background:rgba(255,0,0,.04);border:1px solid rgba(255,0,0,.15);border-radius:7px;padding:12px 16px;margin-top:14px}
  .prevname{font-family:var(--mono);font-size:13px;color:var(--yt-soft)}
  .prevpath{font-size:11px;color:var(--text3);margin-top:4px}
  .divider{height:1px;background:var(--border);margin:14px 0}
  .section-title{font-family:var(--mono);font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;margin-top:16px}
`;

// ── Metadata Modal ────────────────────────────────────────────────────────────
function MetaModal({ file, onClose, onSave, onToast }) {
  const [fields, setFields] = useState({
    title:       file.title        || "",
    artist:      file.channel      || (file.folderName || ""),
    album:       file.channel      || (file.folderName || ""),
    date:        file.upload_date  || "",
    genre:       "YouTube",
    track:       "",
    description: file.description  || "",
    comment:     file.url          || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));

  // モック: 既存タグ（ffprobe から取得したもの）
  const existingTags = file.meta_written ? {
    "©nam (title)":       file.title,
    "©ART (artist)":      file.channel || file.folderName,
    "©alb (album)":       file.channel || file.folderName,
    "©day (date)":        file.upload_date || "—",
    "©gen (genre)":       "YouTube",
    "©cmt (comment)":     file.url || "—",
    "desc (description)": (file.description || "").slice(0, 60) + "...",
    "covr (thumbnail)":   "埋め込み済み",
  } : null;

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200)); // モック待機
    setSaving(false);
    setSaved(true);
    onSave?.(file.id);
    onToast(`🏷 メタデータを書き込みました: ${file.title}`, "meta");
  };

  const MP4_TAGS = [
    { key:"title",       atom:"©nam", label:"タイトル",   ph:"動画タイトル" },
    { key:"artist",      atom:"©ART", label:"アーティスト (チャンネル名)", ph:"チャンネル名" },
    { key:"album",       atom:"©alb", label:"アルバム (プレイリスト / チャンネル)", ph:"コレクション名" },
    { key:"date",        atom:"©day", label:"日付 (YYYYMMDD)", ph:"20240315" },
    { key:"genre",       atom:"©gen", label:"ジャンル",    ph:"YouTube" },
    { key:"track",       atom:"trkn", label:"トラック番号", ph:"1/12" },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && !saving && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <span>🏷 MP4メタデータ編集</span>
          <button className="close-btn" onClick={onClose} disabled={saving}>✕</button>
        </div>
        <div className="modal-body">

          {/* 現在の埋め込みタグ（読み取り表示） */}
          <div className="meta-read-panel">
            <div className="head">
              現在のタグ（ffprobe）
              <span className={`meta-status-badge ${file.meta_written ? "ok" : "no"}`}>
                {file.meta_written ? "🏷 書き込み済み" : "未書き込み"}
              </span>
            </div>
            {existingTags ? (
              Object.entries(existingTags).map(([k, v]) => (
                <div className="meta-tag-row" key={k}>
                  <span className="meta-tag-key">{k}</span>
                  <span className="meta-tag-val">{v || <span className="meta-empty">—</span>}</span>
                </div>
              ))
            ) : (
              <div style={{fontSize:12,color:"var(--text3)"}}>メタデータはまだ書き込まれていません。</div>
            )}
          </div>

          {/* 書き込みフォーム */}
          <div className="section-title">書き込む内容</div>

          {MP4_TAGS.map(({ key, atom, label, ph }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <label style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".08em" }}>
                  {label}
                </label>
                <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", opacity:.7 }}>{atom}</span>
              </div>
              <input
                className="ifield"
                value={fields[key]}
                placeholder={ph}
                onChange={e => set(key, e.target.value)}
                disabled={saving}
              />
            </div>
          ))}

          {/* 説明文 */}
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <label style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".08em" }}>説明 / description</label>
              <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", opacity:.7 }}>desc</span>
            </div>
            <textarea className="ifield" value={fields.description} onChange={e=>set("description",e.target.value)} disabled={saving} placeholder="概要欄テキスト" />
          </div>

          {/* コメント（URL） */}
          <div style={{ marginBottom:4 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <label style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".08em" }}>コメント（元URL）</label>
              <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", opacity:.7 }}>©cmt</span>
            </div>
            <input className="ifield" value={fields.comment} onChange={e=>set("comment",e.target.value)} disabled={saving} placeholder="https://youtube.com/watch?v=..." />
          </div>

          <div className="divider"/>
          <div style={{ fontSize:11, color:"var(--text3)", lineHeight:1.6 }}>
            ※ ffmpeg でファイルを上書きします。カバーアート（covr）はダウンロード時にのみ埋め込まれます。
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn btn-g" onClick={onClose} disabled={saving}>キャンセル</button>
          <button className="btn btn-purple" onClick={handleSave} disabled={saving || saved}>
            {saving ? "書き込み中..." : saved ? "✓ 完了" : "🏷 メタデータを書き込む"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SFTP Modal ────────────────────────────────────────────────────────────────
function SftpModal({ targets, onClose, onToast }) {
  const [host,setHost]=useState("192.168.1.100");
  const [port,setPort]=useState("22");
  const [user,setUser]=useState("pi");
  const [pass,setPass]=useState("");
  const [dest,setDest]=useState("/home/pi/Videos");
  const [running,setRunning]=useState(false);
  const [prog,setProg]=useState(0);
  const [curFile,setCurFile]=useState("");
  const [speed,setSpeed]=useState("—");
  const [logs,setLogs]=useState([]);
  const logRef=useRef(null);
  const addLog=(msg,type="info")=>{const t=new Date().toLocaleTimeString("ja-JP");setLogs(l=>[...l,{t,msg,type}]);setTimeout(()=>{if(logRef.current)logRef.current.scrollTop=9999},50)};
  const start=()=>{
    if(!host||!user)return;
    setRunning(true);setProg(0);setLogs([]);
    addLog(`接続中: ${user}@${host}:${port}`,"info");
    let idx=0;
    const tick=setInterval(()=>{
      if(idx>=targets.length){clearInterval(tick);setProg(100);setSpeed("—");addLog("全ファイルの転送が完了しました ✓","ok");setRunning(false);onToast(`SFTPで ${targets.length} ファイルを転送しました`,"success");return}
      const f=targets[idx];setCurFile(f.title||f.name);
      const sp=(Math.random()*8+2).toFixed(1);setSpeed(`${sp} MB/s`);
      addLog(`転送中: ${f.title||f.name} @ ${sp} MB/s`);
      setProg(Math.round(((idx+1)/targets.length)*100));idx++;
    },900);
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&!running&&onClose()}>
      <div className="modal">
        <div className="modal-hd"><span>📡 SFTPで転送 — {targets.length===1?targets[0].title:targets.length+" ファイル"}</span><button className="close-btn" onClick={onClose} disabled={running}>✕</button></div>
        <div className="modal-body">
          <div className="frow">
            <div className="ig" style={{flex:2}}><label>ホスト / IP</label><input className="ifield" value={host} onChange={e=>setHost(e.target.value)} disabled={running}/></div>
            <div className="ig" style={{flex:"none",width:80}}><label>ポート</label><input className="ifield" value={port} onChange={e=>setPort(e.target.value)} disabled={running}/></div>
          </div>
          <div className="frow">
            <div className="ig"><label>ユーザー名</label><input className="ifield" value={user} onChange={e=>setUser(e.target.value)} disabled={running}/></div>
            <div className="ig"><label>パスワード</label><input className="ifield" type="password" value={pass} onChange={e=>setPass(e.target.value)} disabled={running} placeholder="（空欄=鍵認証）"/></div>
          </div>
          <div className="ig"><label>転送先パス</label><input className="ifield" value={dest} onChange={e=>setDest(e.target.value)} disabled={running}/></div>
          {(running||prog===100)&&(
            <div className="sftp-prog-wrap">
              <div className="divider"/>
              <div className="sftp-file-name">▶ {curFile||"準備中..."}</div>
              <div className="sftp-pt"><div className="sftp-pf" style={{width:prog+"%"}}/></div>
              <div className="sftp-stats">
                <span>進捗 <span className="v">{prog}%</span></span>
                <span>速度 <span className="v">{speed}</span></span>
                <span>残り <span className="v">{prog===100?"完了":`${targets.length-Math.round(prog/100*targets.length)}ファイル`}</span></span>
              </div>
              <div className="sftp-log" ref={logRef}>
                {logs.map((l,i)=><div key={i} className={l.type}><span style={{opacity:.5}}>[{l.t}]</span> {l.msg}</div>)}
              </div>
            </div>
          )}
        </div>
        <div className="modal-ft">
          <button className="btn btn-g" onClick={onClose} disabled={running}>キャンセル</button>
          <button className="btn btn-blue" onClick={start} disabled={running||!host||!user||prog===100}>
            {running?"転送中...":prog===100?"完了 ✓":"📡 転送開始"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Files Page ────────────────────────────────────────────────────────────────
function FilesPage({ folders, onToast }) {
  const [search,setSearch]=useState("");
  const [sort,setSort]=useState("date");
  const [selected,setSelected]=useState(new Set());
  const [sftpTargets,setSftpTargets]=useState(null);
  const [metaFile,setMetaFile]=useState(null);
  const [folderData,setFolderData]=useState(folders);

  const allFiles=folderData.flatMap(f=>f.files.map(file=>({...file,folderName:f.name})));
  const filtered=allFiles.filter(f=>f.title.toLowerCase().includes(search.toLowerCase())||f.folderName.toLowerCase().includes(search.toLowerCase()));
  const sorted=[...filtered].sort((a,b)=>sort==="date"?b.date.localeCompare(a.date):a.title.localeCompare(b.title));

  const toggle=id=>setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n});
  const toggleAll=()=>setSelected(s=>s.size===sorted.length&&sorted.length>0?new Set():new Set(sorted.map(f=>f.id)));
  const clearSel=()=>setSelected(new Set());

  const markMetaWritten=(fileId)=>{
    setFolderData(fd=>fd.map(f=>({...f,files:f.files.map(ff=>ff.id===fileId?{...ff,meta_written:true}:ff)})));
  };

  const total=allFiles.reduce((a,f)=>a+parseFloat(f.size),0);
  const metaCount=allFiles.filter(f=>f.meta_written).length;
  const selFiles=allFiles.filter(f=>selected.has(f.id));

  return (
    <>
      <div style={{display:"flex",gap:16,marginBottom:14,fontSize:11,color:"var(--text3)",fontFamily:"var(--mono)",flexWrap:"wrap"}}>
        <span>{allFiles.length} ファイル · 合計 {total.toFixed(0)} MB</span>
        <span style={{color:"var(--purple)"}}>🏷 メタデータ書込済: {metaCount} / {allFiles.length}</span>
      </div>

      {selected.size>0&&(
        <div className="bulk-bar">
          <span><span className="count">{selected.size}</span> ファイル選択中</span>
          <div style={{flex:1}}/>
          <button className="btn btn-g btn-s" onClick={clearSel}>解除</button>
          <button className="btn btn-purple btn-s" onClick={()=>{onToast(`🏷 ${selected.size}ファイルにメタデータを一括書き込み中`,"meta");clearSel()}}>🏷 一括メタ書込</button>
          <button className="btn btn-amber btn-s" onClick={()=>{onToast(`⬇ ${selected.size}ファイルをZIPダウンロード`,"info");clearSel()}}>⬇ ZIP DL</button>
          <button className="btn btn-blue btn-s" onClick={()=>setSftpTargets(selFiles)}>📡 SFTP</button>
        </div>
      )}

      <div className="files-toolbar">
        <input className="ifield files-search" placeholder="検索..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="ifield" style={{width:"auto"}} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="date">日付順</option><option value="title">タイトル順</option>
        </select>
        <button className="btn btn-g btn-s" onClick={toggleAll}>{selected.size===sorted.length&&sorted.length>0?"全解除":"全選択"}</button>
      </div>

      <div className="card" style={{padding:0}}>
        <table className="ftbl">
          <thead>
            <tr>
              <th style={{width:36,paddingLeft:16}}><input type="checkbox" className="cb" checked={selected.size===sorted.length&&sorted.length>0} onChange={toggleAll}/></th>
              <th style={{width:16}}></th>
              <th></th>
              <th>タイトル</th>
              <th>形式</th>
              <th>サイズ</th>
              <th>保存日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(f=>(
              <tr key={f.id} className={selected.has(f.id)?"sel-row":""}>
                <td style={{paddingLeft:16}}><input type="checkbox" className="cb" checked={selected.has(f.id)} onChange={()=>toggle(f.id)}/></td>
                <td><span className="meta-dot" title={f.meta_written?"メタデータ書込済":"未書き込み"} style={{background:f.meta_written?"var(--purple)":"var(--border3)",boxShadow:f.meta_written?"0 0 5px var(--purple)":"none"}}/></td>
                <td style={{fontSize:18,textAlign:"center",padding:"9px 6px"}}>{f.ext==="mp3"?"🎵":"🎬"}</td>
                <td>
                  <div className="ft">{f.title}</div>
                  <div className="fc">📁 {f.folderName}</div>
                </td>
                <td><span className="qtag qtag-f">{f.quality}</span></td>
                <td><span className="qtag qtag-s">{f.size}</span></td>
                <td style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text3)"}}>{f.date}</td>
                <td>
                  <div style={{display:"flex",gap:4}}>
                    <button className="btn btn-g btn-xs" title="再生">▶</button>
                    <button className="btn btn-purple btn-xs" title="メタデータ編集" onClick={()=>setMetaFile(f)}>🏷</button>
                    <button className="btn btn-amber btn-xs" title="ダウンロード" onClick={()=>onToast(`⬇ ${f.title}`,"info")}>⬇</button>
                    <button className="btn btn-blue btn-xs" title="SFTP" onClick={()=>setSftpTargets([f])}>📡</button>
                    <button className="btn btn-d btn-xs" title="削除">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div style={{fontSize:11,color:"var(--text3)",display:"flex",gap:16,marginTop:8}}>
        <span><span className="meta-dot ok" style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"var(--purple)",verticalAlign:"middle",marginRight:5}}/>メタデータ書込済</span>
        <span><span className="meta-dot" style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"var(--border3)",verticalAlign:"middle",marginRight:5}}/>未書き込み</span>
        <span>🏷 ボタンで個別編集・書き込み</span>
      </div>

      {metaFile&&<MetaModal file={metaFile} onClose={()=>setMetaFile(null)} onSave={markMetaWritten} onToast={onToast}/>}
      {sftpTargets&&<SftpModal targets={sftpTargets} onClose={()=>setSftpTargets(null)} onToast={onToast}/>}
    </>
  );
}

// ── Folder Page ───────────────────────────────────────────────────────────────
function FolderPage({ folders, onToast }) {
  const [openId,setOpenId]=useState(null);
  const [selFolders,setSelFolders]=useState(new Set());
  const [sftpTargets,setSftpTargets]=useState(null);
  const [metaFile,setMetaFile]=useState(null);
  const [folderData,setFolderData]=useState(folders);

  const toggleSel=(id,e)=>{e.stopPropagation();setSelFolders(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n})};
  const selFiles=folderData.filter(f=>selFolders.has(f.id)).flatMap(f=>f.files);

  const markMetaWritten=(fileId)=>{
    setFolderData(fd=>fd.map(f=>({...f,files:f.files.map(ff=>ff.id===fileId?{...ff,meta_written:true}:ff)})));
  };

  return (
    <>
      {selFolders.size>0&&(
        <div className="folder-sel-bar">
          <span><span className="count">{selFolders.size}</span> フォルダ選択中 ({selFiles.length} ファイル)</span>
          <div style={{flex:1}}/>
          <button className="btn btn-g btn-s" onClick={()=>setSelFolders(new Set())}>解除</button>
          <button className="btn btn-purple btn-s" onClick={()=>{onToast(`🏷 ${selFolders.size}フォルダのメタデータを一括書き込み`,"meta");setSelFolders(new Set())}}>🏷 一括メタ書込</button>
          <button className="btn btn-amber btn-s" onClick={()=>{onToast(`📦 ${selFolders.size}フォルダをZIPダウンロード`,"info");setSelFolders(new Set())}}>⬇ まとめてDL</button>
          <button className="btn btn-blue btn-s" onClick={()=>setSftpTargets(selFiles)}>📡 SFTP</button>
        </div>
      )}
      <div style={{marginBottom:12,fontSize:11,color:"var(--text3)",fontFamily:"var(--mono)"}}>
        {folderData.length} フォルダ · {folderData.reduce((a,f)=>a+f.fileCount,0)} ファイル
      </div>
      <div className="folder-grid">
        {folderData.map(folder=>{
          const written=folder.files.filter(f=>f.meta_written).length;
          return (
            <div key={folder.id} className={`folder-card${openId===folder.id?" open":""}`}>
              <div className="folder-header" onClick={()=>setOpenId(p=>p===folder.id?null:folder.id)}>
                <input type="checkbox" className="cb" checked={selFolders.has(folder.id)} onChange={e=>toggleSel(folder.id,e)} onClick={e=>e.stopPropagation()}/>
                <span className="folder-icon">📁</span>
                <div className="folder-meta">
                  <div className="folder-name">{folder.name}</div>
                  <div className="folder-info">
                    {folder.fileCount} 本 · {folder.totalSize}
                    <span style={{marginLeft:8,color:"var(--purple)"}}>🏷 {written}/{folder.files.length}</span>
                  </div>
                </div>
                <div className="folder-actions" onClick={e=>e.stopPropagation()}>
                  <button className="btn btn-purple btn-xs" title="フォルダ一括メタ書込" onClick={e=>{e.stopPropagation();onToast(`🏷 "${folder.name}" のメタデータを一括書き込み`,"meta")}}>🏷</button>
                  <button className="btn btn-amber btn-xs" title="ZIPダウンロード" onClick={e=>{e.stopPropagation();onToast(`📦 "${folder.name}" をZIPダウンロード`,"info")}}>⬇</button>
                  <button className="btn btn-blue btn-xs" title="SFTPで転送" onClick={e=>{e.stopPropagation();setSftpTargets(folder.files)}}>📡</button>
                  <span style={{color:"var(--text3)",fontSize:12,marginLeft:2}}>{openId===folder.id?"▲":"▼"}</span>
                </div>
              </div>
              {openId===folder.id&&(
                <div className="folder-files">
                  {folder.files.map(f=>(
                    <div key={f.id} className="folder-file-row">
                      <span style={{fontSize:13}}>{f.ext==="mp3"?"🎵":"🎬"}</span>
                      <span className="meta-dot" style={{background:f.meta_written?"var(--purple)":"var(--border3)",boxShadow:f.meta_written?"0 0 4px var(--purple)":"none"}}/>
                      <span className="ffr-name">{f.title}</span>
                      <span className="qtag qtag-f" style={{flexShrink:0,marginRight:4}}>{f.quality}</span>
                      <span className="ffr-meta">{f.size}</span>
                      <div style={{display:"flex",gap:4,marginLeft:8,flexShrink:0}}>
                        <button className="btn btn-g btn-xs">▶</button>
                        <button className="btn btn-purple btn-xs" title="メタデータ編集" onClick={()=>setMetaFile({...f,folderName:folder.name})}>🏷</button>
                        <button className="btn btn-amber btn-xs" onClick={()=>onToast(`⬇ ${f.title}`,"info")}>⬇</button>
                        <button className="btn btn-blue btn-xs" onClick={()=>setSftpTargets([f])}>📡</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {metaFile&&<MetaModal file={metaFile} onClose={()=>setMetaFile(null)} onSave={markMetaWritten} onToast={onToast}/>}
      {sftpTargets&&<SftpModal targets={sftpTargets} onClose={()=>setSftpTargets(null)} onToast={onToast}/>}
    </>
  );
}

// ── Queue Item ────────────────────────────────────────────────────────────────
function QItem({ item, onRemove, onPause }) {
  const m=STATUS_META[item.status]||STATUS_META.pending;
  return (
    <div className="qi">
      <div className="qthumb">
        {item.thumbnail?<img src={item.thumbnail} alt="" onError={e=>e.target.style.display="none"}/>:<span className="qthp">▶</span>}
      </div>
      <div className="qbody">
        <div className="qtop">
          <div style={{flex:1,minWidth:0}}>
            <div className="qtitle">{item.title}</div>
            <div className="qch">📺 {item.channel} · {item.episode}</div>
          </div>
          <div className="sbadge" style={{background:m.color+"20",color:m.color}}>{m.icon} {m.label}</div>
          <span className="qtag qtag-f">{item.quality}</span>
          {item.status==="done"&&(
            <span className={`qtag ${item.meta_written?"qtag-meta":"qtag-no-meta"}`}>
              {item.meta_written?"🏷 メタ済":"メタ未"}
            </span>
          )}
        </div>
        <div className="pt"><div className="pf" style={{width:item.progress+"%",background:m.color}}/></div>
        <div className="qmeta">
          <span>進捗 <span className="v">{item.progress}%</span></span>
          <span>速度 <span className="v">{item.speed}</span></span>
          <span>残り <span className="v">{item.eta}</span></span>
          <span>サイズ <span className="v">{item.size}</span></span>
        </div>
        <div className="qacts">
          {item.status==="downloading"&&<button className="btn btn-g btn-s" onClick={()=>onPause?.(item.id)}>⏸ 一時停止</button>}
          {item.status==="paused"&&<button className="btn btn-g btn-s">▶ 再開</button>}
          <button className="btn btn-g btn-s">↑ 優先</button>
          <button className="btn btn-d btn-s" onClick={()=>onRemove?.(item.id)}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ queue, folders }) {
  const active=queue.filter(q=>q.status==="downloading").length;
  const tagging=queue.filter(q=>q.status==="tagging").length;
  const fileCount=folders.reduce((a,f)=>a+f.fileCount,0);
  const metaCount=folders.reduce((a,f)=>a+f.files.filter(x=>x.meta_written).length,0);
  return (
    <>
      <div className="sgrid">
        <div className="sc acc"><div className="sl">ダウンロード中</div><div className="sv r">{active}</div><div className="ss2">アクティブ</div></div>
        <div className="sc" style={{borderColor:tagging>0?"rgba(156,39,176,.3)":"",background:tagging>0?"rgba(156,39,176,.04)":""}}><div className="sl">メタデータ書込中</div><div className="sv" style={{color:"var(--purple)"}}>{tagging}</div><div className="ss2">タグ書き込み</div></div>
        <div className="sc"><div className="sl">保存済み</div><div className="sv">{fileCount}</div><div className="ss2">{folders.length} フォルダ</div></div>
        <div className="sc"><div className="sl">タグ書込済</div><div className="sv" style={{color:"var(--purple)"}}>{metaCount}</div><div className="ss2">/ {fileCount} ファイル</div></div>
      </div>
      <div className="phd">▤ 処理中のキュー</div>
      {queue.slice(0,3).map(q=>{
        const m=STATUS_META[q.status];
        return (
          <div key={q.id} className="qi" style={{opacity:.85}}>
            <div className="qthumb">{q.thumbnail?<img src={q.thumbnail} alt=""/>:<span className="qthp">▶</span>}</div>
            <div className="qbody">
              <div className="qtop">
                <div style={{flex:1,minWidth:0}}><div className="qtitle">{q.title}</div><div className="qch">📺 {q.channel}</div></div>
                <div className="sbadge" style={{background:m.color+"20",color:m.color}}>{m.icon} {m.label}</div>
                <span className="qtag qtag-f">{q.quality}</span>
              </div>
              <div className="pt"><div className="pf" style={{width:q.progress+"%",background:m.color}}/></div>
              <div className="qmeta"><span>進捗 <span className="v">{q.progress}%</span></span><span>速度 <span className="v">{q.speed}</span></span></div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── New Download ──────────────────────────────────────────────────────────────
function NewDownload({ onAdd }) {
  const [url,setUrl]=useState("");
  const [fmt,setFmt]=useState("1080p");
  const [mode,setMode]=useState("single");
  const [ef,setEf]=useState("1");
  const [et,setEt]=useState("10");
  const [embedMeta,setEmbedMeta]=useState(true);
  const [embedThumb,setEmbedThumb]=useState(true);
  const ispl=url.includes("playlist")||url.includes("list=");
  const fmts=["360p","480p","720p","1080p","—","mp3","m4a"];
  const paste=async()=>{try{const t=await navigator.clipboard.readText();setUrl(t)}catch{setUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")}};
  const add=()=>{if(!url.trim())return;onAdd({url,fmt,mode,ef,et,ispl,embedMeta,embedThumb});setUrl("")};
  const ext=["mp3","m4a"].includes(fmt)?fmt:"mp4";
  const epLabel=mode==="all"?"全て":mode==="range"?`#${ef}-${et}`:"単話";

  return (
    <>
      <div className="card">
        <div className="clabel">YouTube URL</div>
        <div className="uiwrap">
          <input className="ifield" placeholder="https://youtube.com/watch?v=... または playlist?list=..." value={url} onChange={e=>setUrl(e.target.value)}/>
          <button className="upbtn" onClick={paste}>貼り付け</button>
        </div>
        {ispl&&<div className="hint"><span style={{color:"var(--amber)",flexShrink:0}}>📋</span>プレイリストURLを検出。範囲指定で一括ダウンロードできます。</div>}
      </div>

      <div className="card">
        <div className="clabel">フォーマット / 画質</div>
        <div className="fmtgrid">
          {fmts.map(f=>f==="—"?<span key="s" className="fmtsep">|</span>:<div key={f} className={`fmtbtn${fmt===f?" sel":""}`} onClick={()=>setFmt(f)}>{f}</div>)}
        </div>
      </div>

      {ispl&&(
        <div className="card">
          <div className="clabel">プレイリスト範囲</div>
          <div className="frow" style={{alignItems:"flex-end"}}>
            <div className="ig" style={{flex:"none"}}>
              <label>モード</label>
              <select className="ifield" value={mode} onChange={e=>setMode(e.target.value)}>
                <option value="single">1本のみ</option><option value="range">範囲指定</option><option value="all">全て</option>
              </select>
            </div>
            {mode==="range"&&<>
              <div className="ig" style={{flex:"none",width:80}}><label>開始</label><input className="ifield" type="number" min="1" value={ef} onChange={e=>setEf(e.target.value)}/></div>
              <div style={{paddingBottom:10,color:"var(--text3)"}}>〜</div>
              <div className="ig" style={{flex:"none",width:80}}><label>終了</label><input className="ifield" type="number" min="1" value={et} onChange={e=>setEt(e.target.value)}/></div>
            </>}
          </div>
        </div>
      )}

      {/* メタデータ設定 */}
      <div className="card" style={{borderColor:"rgba(156,39,176,.25)",background:"rgba(156,39,176,.04)"}}>
        <div className="clabel">🏷 メタデータ設定</div>
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          <div className="tr" style={{paddingTop:0}}>
            <div>
              <div style={{fontSize:13}}>メタデータをMP4に書き込む</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>タイトル・チャンネル名・日付・URL・説明文などを埋め込む</div>
            </div>
            <div className={`tog${embedMeta?" on":""}`} style={embedMeta?{background:"var(--purple)"}:{}} onClick={()=>setEmbedMeta(x=>!x)}/>
          </div>
          <div className="tr">
            <div>
              <div style={{fontSize:13}}>サムネイルをカバーアートとして埋め込む</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>MP4の covr タグにYouTubeのサムネイル画像を埋め込む</div>
            </div>
            <div className={`tog${embedThumb?" on":""}`} style={embedThumb?{background:"var(--purple)"}:{}} onClick={()=>setEmbedThumb(x=>!x)}/>
          </div>
        </div>
        {embedMeta&&(
          <div style={{marginTop:12,padding:"10px 14px",background:"var(--bg3)",borderRadius:6,fontSize:11,color:"var(--text3)",fontFamily:"var(--mono)",lineHeight:1.8}}>
            書き込まれるタグ: <span style={{color:"var(--purple)"}}>©nam</span> タイトル · <span style={{color:"var(--purple)"}}>©ART</span> チャンネル · <span style={{color:"var(--purple)"}}>©alb</span> アルバム · <span style={{color:"var(--purple)"}}>©day</span> 日付 · <span style={{color:"var(--purple)"}}>©gen</span> ジャンル · <span style={{color:"var(--purple)"}}>©cmt</span> URL · <span style={{color:"var(--purple)"}}>desc</span> 説明{embedThumb&&<> · <span style={{color:"var(--purple)"}}>covr</span> カバーアート</>}
          </div>
        )}
      </div>

      <div className="prev">
        <div className="clabel">保存プレビュー</div>
        <div className="prevname">[{url?"動画タイトル":"—"}] [{fmt}].{ext}</div>
        <div className="prevpath">~/Downloads/YouTube/{url?"チャンネル名/":"—"}</div>
      </div>
      <div style={{marginTop:16,display:"flex",gap:10}}>
        <button className="btn btn-yt" onClick={add} disabled={!url.trim()}>⬇ ダウンロード開始</button>
        <button className="btn btn-g" onClick={()=>setUrl("")}>クリア</button>
      </div>
    </>
  );
}

// ── Queue Page ────────────────────────────────────────────────────────────────
function QueuePage({ queue, setQueue }) {
  const remove=id=>setQueue(q=>q.filter(i=>i.id!==id));
  const pause=id=>setQueue(q=>q.map(i=>i.id===id?{...i,status:"paused"}:i));
  const groups=[
    {label:"処理中",items:queue.filter(i=>["downloading","converting","tagging"].includes(i.status))},
    {label:"待機中",items:queue.filter(i=>["pending","paused"].includes(i.status))},
    {label:"完了",  items:queue.filter(i=>["done","error"].includes(i.status))},
  ].filter(g=>g.items.length>0);
  if(!queue.length) return <div style={{textAlign:"center",padding:"60px 0",color:"var(--text3)",fontSize:13}}>キューは空です。</div>;
  return <>{groups.map(g=><div key={g.label}><div className="phd">▤ {g.label}</div>{g.items.map(q=><QItem key={q.id} item={q} onRemove={remove} onPause={pause}/>)}</div>)}</>;
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsPage() {
  const [discord,setDiscord]=useState("");
  const [path,setPath]=useState("~/Downloads/YouTube");
  const [t,setT]=useState({conv:true,resume:true,notify:false,meta:true,thumb:true,stream:true,cookies:false});
  const tog=k=>setT(x=>({...x,[k]:!x[k]}));
  return (
    <div className="setgrid">
      <div className="card setcard">
        <h3>Discord通知</h3>
        <div className="ig" style={{marginBottom:14}}><label>Webhook URL</label><input className="ifield" placeholder="https://discord.com/api/webhooks/..." value={discord} onChange={e=>setDiscord(e.target.value)}/></div>
        <div className="tr">完了時に通知 <div className={`tog${t.notify?" on":""}`} onClick={()=>tog("notify")}/></div>
        <div style={{marginTop:12}}><button className="btn btn-g btn-s">🔔 テスト送信</button></div>
      </div>
      <div className="card setcard">
        <h3>ファイル保存</h3>
        <div className="ig" style={{marginBottom:14}}><label>保存先パス</label><input className="ifield" value={path} onChange={e=>setPath(e.target.value)}/></div>
        <div className="tr">自動 mp4 変換 (ffmpeg) <div className={`tog${t.conv?" on":""}`} onClick={()=>tog("conv")}/></div>
      </div>
      <div className="card setcard" style={{borderColor:"rgba(156,39,176,.25)"}}>
        <h3>🏷 メタデータ（デフォルト）</h3>
        <div className="tr">ダウンロード時に自動書き込み <div className={`tog${t.meta?" on":""}`} style={t.meta?{background:"var(--purple)"}:{}} onClick={()=>tog("meta")}/></div>
        <div className="tr">カバーアート埋め込み（covr） <div className={`tog${t.thumb?" on":""}`} style={t.thumb?{background:"var(--purple)"}:{}} onClick={()=>tog("thumb")}/></div>
      </div>
      <div className="card setcard">
        <h3>SFTP デフォルト</h3>
        <div className="ig" style={{marginBottom:10}}><label>ホスト</label><input className="ifield" placeholder="192.168.1.100"/></div>
        <div className="ig" style={{marginBottom:10}}><label>ユーザー</label><input className="ifield" placeholder="pi"/></div>
        <div className="ig"><label>転送先パス</label><input className="ifield" placeholder="/home/pi/Videos"/></div>
      </div>
    </div>
  );
}

// ── TopBar / Sidebar ──────────────────────────────────────────────────────────
function TopBar({ stats }) {
  return (
    <div className="topbar">
      <div className="logo"><div className="yt-badge"/>YTDownload</div>
      <div className="sp"/>
      <div className="chip">CPU <span className="v">{Math.round(stats.cpu)}%</span></div>
      <div className="chip">MEM <span className="v">{stats.mem}%</span></div>
      <div className="chip">🌡 <span className={stats.temp>75?"warn":"ok"}>{Math.round(stats.temp)}°C</span></div>
      <div className="chip">🔋 <span className={stats.battery<20?"warn":"ok"}>{stats.battery}%</span></div>
      <div className="chip">⬇ <span className="dl">{stats.dlSpeed}</span></div>
    </div>
  );
}
function Sidebar({ page, setPage, queueCount }) {
  const nav=[
    {id:"overview",icon:"⊞",label:"ダッシュボード"},
    {id:"download",icon:"⊕",label:"新規ダウンロード"},
    {id:"queue",   icon:"▤", label:"キュー",badge:queueCount},
    {id:"files",   icon:"⊟",label:"ファイル管理"},
    {id:"folders", icon:"📁",label:"フォルダ管理"},
    {id:"settings",icon:"⊙",label:"設定"},
  ];
  return (
    <div className="sidebar">
      {nav.map(n=>(
        <div key={n.id} className={`nav${page===n.id?" on":""}`} onClick={()=>setPage(n.id)}>
          <span className="ni">{n.icon}</span>{n.label}
          {n.badge>0&&<span className="nbadge">{n.badge}</span>}
        </div>
      ))}
      <div className="sfooter"><div className="spill"><div className="dot-g"/>localhost:8765</div></div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
let tid=0;
export default function App() {
  const [page,setPage]=useState("overview");
  const [queue,setQueue]=useState(MOCK_QUEUE);
  const [folders]=useState(MOCK_FOLDERS);
  const [toasts,setToasts]=useState([]);
  const [stats,setStats]=useState({cpu:28,mem:54,temp:59,battery:76,dlSpeed:"3.8 MB/s"});

  useEffect(()=>{
    const t=setInterval(()=>{
      setQueue(q=>q.map(i=>{
        if(i.status==="downloading"&&i.progress<100){const p=Math.min(95,i.progress+Math.random()*2.5);return{...i,progress:Math.round(p),status:p>=95?"converting":"downloading"}}
        if(i.status==="converting"&&i.progress<97){const p=Math.min(97,i.progress+Math.random()*3);return{...i,progress:Math.round(p),status:p>=97?"tagging":"converting"}}
        if(i.status==="tagging"&&i.progress<100){const p=Math.min(100,i.progress+Math.random()*1.5);return{...i,progress:Math.round(p),status:p>=100?"done":"tagging",meta_written:p>=100?true:i.meta_written}}
        return i;
      }));
      setStats(s=>({...s,cpu:Math.max(10,Math.min(90,s.cpu+(Math.random()-.5)*10)),temp:Math.max(45,Math.min(88,s.temp+(Math.random()-.5)*2))}));
    },1400);
    return()=>clearInterval(t);
  },[]);

  const toast=(msg,type="success")=>{
    const id=++tid;
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);
  };

  const handleAdd=({url,fmt,mode,ef,et,ispl})=>{
    let host="#";try{host=new URL(url.startsWith("http")?url:"https://"+url).hostname}catch{}
    const ep=ispl?(mode==="all"?"プレイリスト全話":mode==="range"?`#${ef}-${et}`:"1本"):"単話";
    setQueue(q=>[...q,{id:String(Date.now()),title:"メタデータ取得中...",channel:host,episode:ep,quality:fmt,status:"pending",progress:0,speed:"—",eta:"—",size:"—",thumbnail:null,meta_written:false}]);
    toast(`キューに追加しました [${fmt}]`);
    setPage("queue");
  };

  const activeCount=queue.filter(i=>["downloading","converting","tagging","pending"].includes(i.status)).length;
  const pages={overview:"ダッシュボード",download:"新規ダウンロード",queue:"ダウンロードキュー",files:"ファイル管理",folders:"フォルダ管理",settings:"設定"};
  const icons={overview:"⊞",download:"⊕",queue:"▤",files:"⊟",folders:"📁",settings:"⊙"};

  return (
    <>
      <style>{css}</style>
      <div className="layout">
        <TopBar stats={stats}/>
        <Sidebar page={page} setPage={setPage} queueCount={activeCount}/>
        <div className="main">
          <div className="phd"><span>{icons[page]}</span>{pages[page]}</div>
          {page==="overview" && <Overview queue={queue} folders={folders}/>}
          {page==="download" && <NewDownload onAdd={handleAdd}/>}
          {page==="queue"    && <QueuePage queue={queue} setQueue={setQueue}/>}
          {page==="files"    && <FilesPage folders={folders} onToast={toast}/>}
          {page==="folders"  && <FolderPage folders={folders} onToast={toast}/>}
          {page==="settings" && <SettingsPage/>}
        </div>
      </div>
      <div className="twrap">
        {toasts.map(t=><div key={t.id} className={`toast ${t.type}`}>{t.type==="success"?"✓":t.type==="error"?"✕":t.type==="meta"?"🏷":"ℹ"} {t.msg}</div>)}
      </div>
    </>
  );
}
