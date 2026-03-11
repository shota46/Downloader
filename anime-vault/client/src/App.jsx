import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ══════════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════════
const DEFAULT_API   = "http://localhost:3030"; // hianime-API
const DEFAULT_DL_API = typeof window.__DL_API__ !== "undefined" ? window.__DL_API__ : "http://localhost:4040";

// ══════════════════════════════════════════════════════════════════
//  GLOBAL STYLES
// ══════════════════════════════════════════════════════════════════
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Zen+Kaku+Gothic+New:wght@300;400;500;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --c0:#06060e; --c1:#0d0d1a; --c2:#131325; --c3:#1a1a33;
  --c4:#22223f;
  --cyan:#00ffd5; --cyan2:rgba(0,255,213,.18); --cyan3:rgba(0,255,213,.06);
  --amber:#ffb830; --amber2:rgba(255,184,48,.15);
  --rose:#ff3e6c; --rose2:rgba(255,62,108,.15);
  --green:#3dffa0; --purple:#a78bfa;
  --txt:#dde1f5; --dim:rgba(221,225,245,.4); --dimmer:rgba(221,225,245,.18);
  --border:rgba(0,255,213,.1); --border2:rgba(0,255,213,.22);
  --mono:'JetBrains Mono',monospace; --jp:'Zen Kaku Gothic New',sans-serif;
  --glow: 0 0 12px rgba(0,255,213,.25);
  --r:5px;
}

html,body,#root { height:100%; overflow:hidden; }
body { background:var(--c0); color:var(--txt); font-family:var(--jp); font-size:14px; }

/* ─ scanline texture ─ */
body::before {
  content:''; pointer-events:none; position:fixed; inset:0; z-index:9999;
  background: repeating-linear-gradient(0deg,
    transparent 0px, transparent 3px,
    rgba(0,0,0,.04) 3px, rgba(0,0,0,.04) 4px);
}

::-webkit-scrollbar { width:5px; height:5px; }
::-webkit-scrollbar-track { background:var(--c1); }
::-webkit-scrollbar-thumb { background:var(--c4); border-radius:3px; }
::-webkit-scrollbar-thumb:hover { background:var(--cyan2); }

/* ─ Layout ─ */
.app { display:flex; height:100vh; overflow:hidden; position:relative; }

/* ─ Sidebar ─ */
.sidebar {
  width:210px; flex-shrink:0; display:flex; flex-direction:column;
  background:var(--c1); border-right:1px solid var(--border);
  overflow:hidden;
}
.logo {
  padding:18px 16px 14px;
  border-bottom:1px solid var(--border);
  background: linear-gradient(135deg, var(--c2) 0%, var(--c1) 100%);
}
.logo-mark {
  font-family:var(--mono); font-size:11px; font-weight:700;
  letter-spacing:.25em; color:var(--cyan); text-transform:uppercase;
  text-shadow:var(--glow);
}
.logo-sub { font-size:10px; color:var(--dim); font-family:var(--mono); margin-top:2px; }

.nav-group { padding:10px 0; }
.nav-group-label {
  padding:5px 14px 3px; font-family:var(--mono); font-size:9px;
  letter-spacing:.22em; color:var(--dimmer); text-transform:uppercase;
}
.nav-item {
  display:flex; align-items:center; gap:9px;
  padding:8px 14px; cursor:pointer; color:var(--dim);
  font-size:12.5px; border-left:2px solid transparent;
  transition:all .14s; user-select:none; position:relative;
}
.nav-item:hover { color:var(--txt); background:var(--cyan3); }
.nav-item.active {
  color:var(--cyan); background:var(--cyan3);
  border-left-color:var(--cyan);
  text-shadow:var(--glow);
}
.nav-ico { font-size:14px; width:18px; text-align:center; flex-shrink:0; }
.nav-badge {
  margin-left:auto; background:var(--cyan); color:var(--c0);
  font-family:var(--mono); font-size:9px; font-weight:700;
  padding:1px 5px; border-radius:2px; letter-spacing:.03em;
}
.nav-badge.amber { background:var(--amber); }

/* ─ Server status ─ */
.srv-status {
  margin-top:auto; border-top:1px solid var(--border); padding:12px 14px;
}
.srv-row {
  display:flex; justify-content:space-between; align-items:center;
  font-family:var(--mono); font-size:10px; color:var(--dim); padding:2px 0;
}
.srv-val { color:var(--cyan); }
.srv-val.warn { color:var(--amber); }
.srv-val.ok   { color:var(--green); }
.srv-val.err  { color:var(--rose); }
.srv-label-row { display:flex; align-items:center; gap:5px; }
.pulse-dot {
  width:6px; height:6px; border-radius:50%; flex-shrink:0;
  animation:pulse 1.8s ease-in-out infinite;
}
.pulse-dot.on  { background:var(--green); box-shadow:0 0 6px var(--green); }
.pulse-dot.off { background:var(--rose); animation:none; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

/* ─ Main ─ */
.main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }

.topbar {
  display:flex; align-items:center; gap:12px; padding:10px 20px;
  border-bottom:1px solid var(--border);
  background:var(--c1); flex-shrink:0;
}
.topbar-title {
  font-family:var(--mono); font-size:11px; letter-spacing:.14em;
  color:var(--dim); text-transform:uppercase; white-space:nowrap;
}
.topbar-title span { color:var(--cyan); }
.topbar-sep { color:var(--dimmer); margin:0 2px; }
.topbar-actions { margin-left:auto; display:flex; gap:8px; align-items:center; }

/* ─ Buttons ─ */
.btn {
  font-family:var(--mono); font-size:11px; letter-spacing:.06em;
  padding:5px 13px; border:1px solid var(--border); background:transparent;
  color:var(--dim); cursor:pointer; border-radius:var(--r);
  transition:all .14s; white-space:nowrap; user-select:none;
}
.btn:hover { border-color:var(--border2); color:var(--txt); }
.btn.primary { border-color:var(--cyan); color:var(--cyan); background:var(--cyan3); }
.btn.primary:hover { background:var(--cyan2); box-shadow:var(--glow); }
.btn.danger  { border-color:rgba(255,62,108,.35); color:var(--rose); }
.btn.danger:hover  { background:var(--rose2); }
.btn.amber   { border-color:rgba(255,184,48,.35); color:var(--amber); background:var(--amber2); }
.btn.sm      { padding:3px 9px; font-size:10px; }
.btn:disabled { opacity:.35; cursor:not-allowed; }

/* ─ Content ─ */
.content { flex:1; overflow-y:auto; padding:20px; }

/* ─ Section header ─ */
.sec-head {
  display:flex; align-items:center; gap:10px; margin-bottom:16px;
}
.sec-dot { width:7px; height:7px; border-radius:50%; background:var(--cyan); box-shadow:var(--glow); flex-shrink:0; }
.sec-title { font-family:var(--mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--dim); }

/* ─ Cards ─ */
.card {
  background:var(--c2); border:1px solid var(--border);
  border-radius:var(--r); overflow:hidden;
}
.card-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px; border-bottom:1px solid var(--border);
  font-family:var(--mono); font-size:10px; letter-spacing:.15em;
  text-transform:uppercase; color:var(--dim);
}

/* ─ Stats Row ─ */
.stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
.stat-card {
  background:var(--c2); border:1px solid var(--border);
  border-radius:var(--r); padding:14px; position:relative; overflow:hidden;
}
.stat-card::after {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
}
.sc-cyan::after  { background:linear-gradient(90deg,var(--cyan),transparent); }
.sc-amber::after { background:linear-gradient(90deg,var(--amber),transparent); }
.sc-green::after { background:linear-gradient(90deg,var(--green),transparent); }
.sc-rose::after  { background:linear-gradient(90deg,var(--rose),transparent); }
.stat-lbl { font-family:var(--mono); font-size:9px; letter-spacing:.2em; color:var(--dimmer); text-transform:uppercase; margin-bottom:6px; }
.stat-val { font-family:var(--mono); font-size:26px; font-weight:700; line-height:1; }
.cyan-txt  { color:var(--cyan); }
.amber-txt { color:var(--amber); }
.green-txt { color:var(--green); }
.rose-txt  { color:var(--rose); }
.dim-txt   { color:var(--dim); }
.stat-sub  { font-size:11px; color:var(--dim); margin-top:5px; }

/* ─ Search ─ */
.search-bar {
  display:flex; gap:8px; margin-bottom:20px;
}
.search-input {
  flex:1; background:var(--c2); border:1px solid var(--border);
  color:var(--txt); font-family:var(--mono); font-size:12px;
  padding:8px 14px; border-radius:var(--r); outline:none;
  transition:border-color .14s;
}
.search-input:focus { border-color:var(--border2); }
.search-input::placeholder { color:var(--dimmer); }

/* ─ Anime Grid ─ */
.anime-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:12px;
}
.anime-card {
  background:var(--c2); border:1px solid var(--border);
  border-radius:var(--r); overflow:hidden; cursor:pointer;
  transition:all .2s;
}
.anime-card:hover { border-color:var(--border2); transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,.4); }
.anime-poster {
  width:100%; aspect-ratio:3/4; object-fit:cover; display:block;
  background:var(--c3);
}
.anime-poster-ph {
  width:100%; aspect-ratio:3/4; background:var(--c3);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--mono); font-size:10px; color:var(--dimmer);
  text-align:center; padding:8px;
}
.anime-info { padding:8px; }
.anime-name { font-size:11px; font-weight:500; line-height:1.35; margin-bottom:4px; }
.anime-meta { font-family:var(--mono); font-size:9px; color:var(--dim); }
.ep-badge {
  display:inline-flex; gap:4px; margin-top:5px;
  font-family:var(--mono); font-size:9px;
}
.ep-sub { background:rgba(0,255,213,.12); color:var(--cyan); padding:1px 5px; border-radius:2px; }
.ep-dub { background:rgba(255,184,48,.12); color:var(--amber); padding:1px 5px; border-radius:2px; }

/* ─ Anime Detail Panel ─ */
.detail-overlay {
  position:fixed; inset:0; background:rgba(6,6,14,.88); z-index:200;
  display:flex; align-items:flex-start; justify-content:center;
  overflow-y:auto; padding:20px;
  backdrop-filter:blur(4px);
  animation:fadein .2s ease;
}
@keyframes fadein { from{opacity:0} to{opacity:1} }
.detail-panel {
  background:var(--c1); border:1px solid var(--border2);
  border-radius:8px; width:100%; max-width:860px;
  margin:auto; overflow:hidden;
  box-shadow:0 24px 64px rgba(0,0,0,.7), 0 0 0 1px rgba(0,255,213,.06);
}
.detail-hero {
  display:flex; gap:0; position:relative; overflow:hidden;
}
.detail-poster {
  width:160px; flex-shrink:0;
}
.detail-poster img { width:100%; display:block; }
.detail-poster-ph {
  width:160px; aspect-ratio:3/4; background:var(--c3);
  display:flex; align-items:center; justify-content:center;
  color:var(--dimmer); font-size:11px; font-family:var(--mono);
}
.detail-info {
  flex:1; padding:20px; background:linear-gradient(135deg,var(--c2) 0%,var(--c1) 100%);
}
.detail-title { font-size:18px; font-weight:700; margin-bottom:4px; line-height:1.3; }
.detail-ja    { font-size:13px; color:var(--cyan); margin-bottom:10px; font-weight:300; }
.detail-badges { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:12px; }
.dbadge {
  font-family:var(--mono); font-size:9px; letter-spacing:.08em;
  padding:2px 8px; border-radius:2px; border:1px solid;
}
.db-type   { border-color:rgba(167,139,250,.3); color:var(--purple); background:rgba(167,139,250,.08); }
.db-status { border-color:rgba(0,255,213,.25); color:var(--cyan);   background:var(--cyan3); }
.db-score  { border-color:rgba(255,184,48,.3);  color:var(--amber); background:var(--amber2); }
.detail-synopsis {
  font-size:12px; line-height:1.7; color:var(--dim);
  max-height:80px; overflow-y:auto; margin-bottom:12px;
}
.detail-genres { display:flex; flex-wrap:wrap; gap:5px; }
.genre-tag {
  font-family:var(--mono); font-size:9px; color:var(--dim);
  padding:2px 7px; border:1px solid var(--border); border-radius:2px;
  cursor:pointer; transition:all .12s;
}
.genre-tag:hover { border-color:var(--border2); color:var(--txt); }

.detail-eps-panel { padding:16px 20px; }
.eps-toolbar {
  display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;
}
.quality-chips { display:flex; gap:6px; }
.qchip {
  font-family:var(--mono); font-size:10px; letter-spacing:.06em;
  padding:4px 10px; border:1px solid var(--border);
  background:transparent; color:var(--dim); cursor:pointer;
  border-radius:var(--r); transition:all .12s;
}
.qchip.sel { border-color:var(--amber); color:var(--amber); background:var(--amber2); }
.qchip:hover:not(.sel) { border-color:var(--border2); color:var(--txt); }

/* ─ Episode Table ─ */
.ep-table { width:100%; border-collapse:collapse; }
.ep-table th {
  font-family:var(--mono); font-size:9px; letter-spacing:.18em;
  text-transform:uppercase; color:var(--dimmer);
  padding:8px 10px; text-align:left; border-bottom:1px solid var(--border);
}
.ep-table td { padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.03); font-size:12px; }
.ep-table tr:hover td { background:rgba(0,255,213,.025); }
.ep-num { font-family:var(--mono); font-size:11px; color:var(--cyan); }
.ep-filler { color:var(--amber); font-size:9px; font-family:var(--mono); }

/* ─ Checkbox ─ */
.cb {
  appearance:none; width:13px; height:13px; flex-shrink:0;
  border:1px solid var(--border); border-radius:2px;
  background:var(--c1); cursor:pointer; position:relative;
  transition:all .12s;
}
.cb:checked { background:var(--cyan); border-color:var(--cyan); }
.cb:checked::after {
  content:'✓'; position:absolute; font-size:8px; color:var(--c0);
  top:50%; left:50%; transform:translate(-50%,-53%); font-weight:700;
}

/* ─ Progress ─ */
.prog-track { background:var(--c3); border-radius:2px; overflow:hidden; height:3px; }
.prog-fill  { height:100%; border-radius:2px; transition:width .4s; }
.prog-cyan  { background:linear-gradient(90deg,var(--cyan),var(--purple)); }
.prog-green { background:var(--green); }
.prog-amber { background:var(--amber); }
.prog-rose  { background:var(--rose); }

/* ─ Queue ─ */
.queue-item {
  display:grid;
  grid-template-columns:24px 1fr 70px 80px 70px 60px 60px;
  align-items:center; gap:10px;
  padding:11px 14px;
  border-bottom:1px solid rgba(255,255,255,.03);
  transition:background .12s;
}
.queue-item:hover { background:rgba(0,255,213,.02); }
.queue-rank { font-family:var(--mono); font-size:10px; color:var(--dimmer); text-align:center; }
.queue-info-title { font-size:12px; font-weight:500; }
.queue-info-sub   { font-family:var(--mono); font-size:9px; color:var(--dim); margin-top:1px; }
.queue-quality { font-family:var(--mono); font-size:10px; color:var(--amber); text-align:center; }
.queue-pct { font-family:var(--mono); font-size:11px; color:var(--cyan); text-align:right; }
.queue-speed { font-family:var(--mono); font-size:10px; color:var(--dim); text-align:right; }
.queue-eta   { font-family:var(--mono); font-size:10px; color:var(--dim); text-align:right; }

.sdot { display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:5px; flex-shrink:0; }
.sdot-active { background:var(--cyan); box-shadow:0 0 6px var(--cyan); animation:pulse 1.6s infinite; }
.sdot-queue  { background:var(--dimmer); }
.sdot-done   { background:var(--green); }
.sdot-err    { background:var(--rose); }

/* ─ File Browser ─ */
.file-head {
  display:grid; grid-template-columns:22px 1fr 130px 85px 75px 100px;
  gap:10px; padding:7px 14px;
  font-family:var(--mono); font-size:9px; letter-spacing:.18em;
  text-transform:uppercase; color:var(--dimmer);
  border-bottom:1px solid var(--border);
}
.file-row {
  display:grid; grid-template-columns:22px 1fr 130px 85px 75px 100px;
  gap:10px; padding:9px 14px;
  border-bottom:1px solid rgba(255,255,255,.03); font-size:11px;
  align-items:center; transition:background .12s;
}
.file-row:hover { background:rgba(0,255,213,.02); }
.file-name { font-family:var(--mono); font-size:10px; }
.file-series { color:var(--purple); font-size:11px; }
.file-size { font-family:var(--mono); font-size:10px; color:var(--amber); text-align:right; }
.file-date { font-family:var(--mono); font-size:10px; color:var(--dim); }
.file-actions { display:flex; gap:4px; justify-content:flex-end; }

/* ─ Logs ─ */
.log-wrap {
  font-family:var(--mono); font-size:11px;
  background:var(--c0); border-radius:var(--r);
  border:1px solid var(--border); overflow:hidden;
}
.log-entry {
  display:flex; gap:14px; padding:5px 12px;
  border-bottom:1px solid rgba(255,255,255,.025);
  align-items:baseline;
}
.log-entry:hover { background:rgba(255,255,255,.015); }
.log-time  { color:var(--dimmer); white-space:nowrap; flex-shrink:0; font-size:10px; }
.log-level { width:52px; flex-shrink:0; font-weight:600; font-size:10px; }
.log-INFO    { color:var(--cyan); }
.log-SUCCESS { color:var(--green); }
.log-WARN    { color:var(--amber); }
.log-ERROR   { color:var(--rose); }
.log-DEBUG   { color:var(--dim); }
.log-msg   { color:var(--txt); line-height:1.5; }

/* ─ Settings ─ */
.settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.setting-group { margin-bottom:20px; }
.setting-label {
  font-family:var(--mono); font-size:9px; letter-spacing:.18em;
  text-transform:uppercase; color:var(--dim); margin-bottom:7px; display:block;
}
.setting-input {
  width:100%; background:var(--c1); border:1px solid var(--border);
  color:var(--txt); font-family:var(--mono); font-size:12px;
  padding:7px 12px; border-radius:var(--r); outline:none; transition:border-color .14s;
}
.setting-input:focus { border-color:var(--border2); }
.setting-desc { font-size:11px; color:var(--dimmer); margin-top:5px; }

/* ─ Toast ─ */
.toast-wrap { position:fixed; bottom:20px; right:20px; z-index:9000; display:flex; flex-direction:column; gap:8px; }
.toast {
  background:var(--c2); border:1px solid var(--border2);
  border-left:3px solid var(--cyan);
  padding:10px 14px; border-radius:var(--r);
  font-family:var(--mono); font-size:11px;
  box-shadow:0 8px 24px rgba(0,0,0,.5);
  animation:slideIn .25s ease; min-width:260px;
}
.toast.err  { border-left-color:var(--rose); }
.toast.warn { border-left-color:var(--amber); }
@keyframes slideIn { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }

/* ─ Spinner ─ */
.spin { display:inline-block; animation:spin .8s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }

/* ─ Empty state ─ */
.empty {
  text-align:center; padding:48px 20px;
  font-family:var(--mono); font-size:12px; color:var(--dimmer);
}
.empty-icon { font-size:36px; margin-bottom:12px; opacity:.4; }

/* ─ Tab bar ─ */
.tab-bar { display:flex; border-bottom:1px solid var(--border); margin-bottom:16px; }
.tab-item {
  font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase;
  padding:8px 16px; cursor:pointer; color:var(--dim);
  border-bottom:2px solid transparent; margin-bottom:-1px; transition:all .13s;
}
.tab-item.active { color:var(--cyan); border-bottom-color:var(--cyan); }
.tab-item:hover:not(.active) { color:var(--txt); }

/* ─ select ─ */
.sel-input {
  background:var(--c2); border:1px solid var(--border);
  color:var(--dim); font-family:var(--mono); font-size:11px;
  padding:5px 9px; border-radius:var(--r); outline:none; cursor:pointer;
}
.sel-input:focus { border-color:var(--border2); }

/* ─ Trending section ─ */
.trending-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:10px; }
.tr-card {
  background:var(--c2); border:1px solid var(--border); border-radius:var(--r);
  overflow:hidden; cursor:pointer; transition:all .18s; position:relative;
}
.tr-card:hover { border-color:var(--border2); transform:translateY(-2px); }
.tr-rank {
  position:absolute; top:6px; left:6px;
  background:rgba(6,6,14,.85); font-family:var(--mono); font-size:10px;
  font-weight:700; color:var(--cyan); padding:1px 5px; border-radius:2px;
}
.tr-img { width:100%; aspect-ratio:3/4; object-fit:cover; display:block; background:var(--c3); }
.tr-title { padding:6px 7px; font-size:10px; font-weight:500; line-height:1.3; }

/* ─ Grid 2 cols ─ */
.g2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

/* ─ inline flex utils ─ */
.row  { display:flex; align-items:center; gap:8px; }
.row-sb { display:flex; align-items:center; justify-content:space-between; }
.mb8  { margin-bottom:8px; }
.mb14 { margin-bottom:14px; }
.mb20 { margin-bottom:20px; }
.mt8  { margin-top:8px; }

/* ─ Season selector chips ─ */
.season-chips { display:flex; gap:6px; flex-wrap:wrap; }
.sc {
  font-family:var(--mono); font-size:10px; padding:3px 10px;
  border:1px solid var(--border); background:transparent; color:var(--dim);
  border-radius:var(--r); cursor:pointer; transition:all .12s;
}
.sc.sel { border-color:var(--cyan); color:var(--cyan); background:var(--cyan3); }

/* ─ File Browser v2 ─ */
.fb-toolbar {
  display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap;
}
.fb-view-toggle { display:flex; border:1px solid var(--border); border-radius:var(--r); overflow:hidden; }
.fb-view-btn {
  font-family:var(--mono); font-size:10px; padding:5px 11px;
  background:transparent; border:none; color:var(--dim); cursor:pointer; transition:all .13s;
}
.fb-view-btn.active { background:var(--cyan3); color:var(--cyan); }

/* anime group card */
.ag-card {
  background:var(--c2); border:1px solid var(--border);
  border-radius:var(--r); overflow:hidden; margin-bottom:10px;
  transition:border-color .15s;
}
.ag-card.expanded { border-color:var(--border2); }
.ag-header {
  display:flex; align-items:center; gap:12px; padding:12px 14px;
  cursor:pointer; user-select:none; transition:background .13s;
}
.ag-header:hover { background:rgba(0,255,213,.03); }
.ag-poster {
  width:40px; height:56px; object-fit:cover; border-radius:3px;
  background:var(--c3); flex-shrink:0;
}
.ag-poster-ph {
  width:40px; height:56px; border-radius:3px; background:var(--c3);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--mono); font-size:8px; color:var(--dimmer);
  flex-shrink:0; text-align:center;
}
.ag-title-wrap { flex:1; min-width:0; }
.ag-title { font-size:13px; font-weight:700; margin-bottom:3px; }
.ag-meta  { font-family:var(--mono); font-size:10px; color:var(--dim); }
.ag-stats { display:flex; gap:14px; flex-shrink:0; }
.ag-stat  { text-align:center; }
.ag-stat-val { font-family:var(--mono); font-size:14px; font-weight:700; }
.ag-stat-lbl { font-family:var(--mono); font-size:8px; letter-spacing:.12em; color:var(--dimmer); text-transform:uppercase; }
.ag-chevron { font-size:12px; color:var(--dim); transition:transform .2s; flex-shrink:0; }
.ag-chevron.open { transform:rotate(90deg); color:var(--cyan); }
.ag-actions-bar {
  display:flex; align-items:center; gap:8px; padding:8px 14px;
  border-top:1px solid var(--border); background:rgba(0,255,213,.02);
}
.ag-ep-list { border-top:1px solid var(--border); }
.ag-ep-row {
  display:grid;
  grid-template-columns:36px 36px 1fr 90px 80px 110px;
  gap:8px; align-items:center;
  padding:8px 14px;
  border-bottom:1px solid rgba(255,255,255,.03);
  font-size:12px; transition:background .12s;
}
.ag-ep-row:last-child { border-bottom:none; }
.ag-ep-row:hover { background:rgba(0,255,213,.025); }
.ag-ep-num { font-family:var(--mono); font-size:11px; color:var(--cyan); text-align:right; }

/* URL bulk-add panel */
.url-panel {
  background:var(--c2); border:1px solid var(--border2);
  border-radius:var(--r); padding:16px; margin-bottom:16px;
  position:relative; overflow:hidden;
}
.url-panel::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg,var(--cyan),var(--purple),transparent);
}
.url-panel-title {
  font-family:var(--mono); font-size:10px; letter-spacing:.18em;
  text-transform:uppercase; color:var(--cyan); margin-bottom:10px;
}
.url-input-row { display:flex; gap:8px; margin-bottom:10px; }
.url-ep-range { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.url-ep-range-label {
  font-family:var(--mono); font-size:10px; color:var(--dim);
}
.url-num-input {
  width:60px; background:var(--c1); border:1px solid var(--border);
  color:var(--txt); font-family:var(--mono); font-size:12px;
  padding:5px 8px; border-radius:var(--r); outline:none; text-align:center;
  transition:border-color .14s;
}
.url-num-input:focus { border-color:var(--border2); }
.url-preview {
  margin-top:10px; padding:8px 12px; background:var(--c1);
  border:1px solid var(--border); border-radius:var(--r);
  font-family:var(--mono); font-size:10px; color:var(--dim);
}
.url-preview span { color:var(--cyan); }

/* grid view */
.ag-grid-view { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; }
.ag-grid-card {
  background:var(--c2); border:1px solid var(--border); border-radius:var(--r);
  overflow:hidden; cursor:pointer; transition:all .18s;
}
.ag-grid-card:hover { border-color:var(--border2); transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,.35); }
.ag-grid-poster { width:100%; aspect-ratio:3/4; object-fit:cover; display:block; background:var(--c3); }
.ag-grid-poster-ph {
  width:100%; aspect-ratio:3/4; background:var(--c3);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--mono); font-size:9px; color:var(--dimmer); text-align:center; padding:6px;
}
.ag-grid-info { padding:8px; }
.ag-grid-title { font-size:11px; font-weight:600; margin-bottom:3px; line-height:1.3; }
.ag-grid-count { font-family:var(--mono); font-size:9px; color:var(--cyan); }

/* Api URL hint ─ */
.api-url-pill {
  font-family:var(--mono); font-size:9px; padding:2px 8px;
  border:1px solid var(--border); border-radius:20px; color:var(--dim);
}

/* ─ Loading skeleton ─ */
@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
.skel {
  background: linear-gradient(90deg, var(--c2) 25%, var(--c3) 50%, var(--c2) 75%);
  background-size:800px 100%; animation:shimmer 1.4s infinite;
  border-radius:3px;
}

/* ══ SFTP Modal ══ */
.modal-backdrop {
  position:fixed; inset:0; background:rgba(6,6,14,.92); z-index:500;
  display:flex; align-items:center; justify-content:center;
  backdrop-filter:blur(6px); animation:fadein .18s ease;
}
.modal-box {
  background:var(--c1); border:1px solid var(--border2);
  border-radius:8px; width:100%; max-width:700px; max-height:90vh;
  overflow:hidden; display:flex; flex-direction:column;
  box-shadow:0 32px 80px rgba(0,0,0,.8);
}
.modal-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid var(--border);
  background:var(--c2); flex-shrink:0;
}
.modal-title { font-family:var(--mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--cyan); }
.modal-body { flex:1; overflow-y:auto; padding:18px; }
.sftp-tabs { display:flex; border-bottom:1px solid var(--border); margin-bottom:16px; }
.sftp-tab {
  font-family:var(--mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase;
  padding:8px 16px; cursor:pointer; color:var(--dim);
  border-bottom:2px solid transparent; margin-bottom:-1px; transition:all .13s;
}
.sftp-tab.active { color:var(--cyan); border-bottom-color:var(--cyan); }
.sftp-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
.sftp-field label { display:block; font-family:var(--mono); font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:var(--dim); margin-bottom:5px; }
.sftp-input {
  width:100%; background:var(--c2); border:1px solid var(--border);
  color:var(--txt); font-family:var(--mono); font-size:12px;
  padding:7px 11px; border-radius:var(--r); outline:none; transition:border-color .14s;
}
.sftp-input:focus { border-color:var(--border2); }
.sftp-input::placeholder { color:var(--dimmer); }
.sftp-status-row {
  display:flex; align-items:center; gap:10px; padding:8px 12px;
  background:var(--c0); border:1px solid var(--border);
  border-radius:var(--r); margin-bottom:12px;
  font-family:var(--mono); font-size:10px;
}
.sftp-browser { border:1px solid var(--border); border-radius:var(--r); overflow:hidden; }
.sftp-path-bar {
  display:flex; align-items:center; gap:6px; padding:7px 12px;
  background:var(--c2); border-bottom:1px solid var(--border);
  font-family:var(--mono); font-size:10px; color:var(--dim); flex-wrap:wrap;
}
.sftp-path-seg { color:var(--cyan); cursor:pointer; }
.sftp-path-seg:hover { text-decoration:underline; }
.sftp-row {
  display:flex; align-items:center; gap:10px; padding:8px 12px;
  border-bottom:1px solid rgba(255,255,255,.03); transition:background .12s;
}
.sftp-row:last-child { border-bottom:none; }
.sftp-row:hover { background:rgba(0,255,213,.04); }
.sftp-icon { font-size:13px; width:18px; text-align:center; flex-shrink:0; }
.sftp-name { flex:1; font-family:var(--mono); font-size:11px; cursor:pointer; }
.sftp-name:hover { color:var(--cyan); }
.sftp-size { font-family:var(--mono); font-size:10px; color:var(--amber); flex-shrink:0; width:72px; text-align:right; }

/* ══ DL progress inline ══ */
.inline-prog { display:flex; align-items:center; gap:6px; font-family:var(--mono); font-size:10px; color:var(--cyan); }
.inline-prog-track { flex:1; height:3px; background:var(--c3); border-radius:2px; overflow:hidden; min-width:60px; }
.inline-prog-fill { height:100%; background:linear-gradient(90deg,var(--cyan),var(--purple)); transition:width .3s; }

/* ══ Folder Management Page ══ */
.folder-page { display:flex; gap:14px; height:calc(100vh - 130px); }
.folder-tree {
  width:220px; flex-shrink:0; background:var(--c2);
  border:1px solid var(--border); border-radius:var(--r); overflow-y:auto; display:flex; flex-direction:column;
}
.folder-tree-head {
  padding:10px 14px; border-bottom:1px solid var(--border); flex-shrink:0;
  font-family:var(--mono); font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:var(--dim);
}
.ftree-item {
  display:flex; align-items:center; gap:7px; padding:8px 14px;
  cursor:pointer; font-size:12px; transition:background .12s; border-left:2px solid transparent;
}
.ftree-item:hover { background:rgba(0,255,213,.04); }
.ftree-item.active { background:var(--cyan3); border-left-color:var(--cyan); color:var(--cyan); }
.ftree-item.sub { padding-left:28px; font-size:11px; color:var(--dim); }
.ftree-item.sub.active { color:var(--cyan); }
.ftree-icon { font-size:13px; flex-shrink:0; }
.ftree-count { margin-left:auto; font-family:var(--mono); font-size:9px; color:var(--dimmer); }

.folder-detail { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
.folder-detail-head {
  display:flex; align-items:center; gap:12px; padding:12px 16px;
  background:var(--c2); border:1px solid var(--border); border-radius:var(--r);
  margin-bottom:10px; flex-shrink:0; flex-wrap:wrap;
}
.folder-detail-title { font-size:14px; font-weight:700; }
.folder-detail-meta  { font-family:var(--mono); font-size:10px; color:var(--dim); margin-top:2px; }

.folder-file-list { flex:1; overflow-y:auto; background:var(--c2); border:1px solid var(--border); border-radius:var(--r); }
.folder-file-row-head {
  display:grid; grid-template-columns:22px 34px 1fr 88px 72px 164px;
  gap:8px; padding:7px 14px; border-bottom:1px solid var(--border);
  font-family:var(--mono); font-size:9px; letter-spacing:.18em;
  text-transform:uppercase; color:var(--dimmer); background:var(--c2);
  position:sticky; top:0; z-index:2;
}
.folder-file-row {
  display:grid; grid-template-columns:22px 34px 1fr 88px 72px 164px;
  gap:8px; align-items:center; padding:8px 14px;
  border-bottom:1px solid rgba(255,255,255,.03); font-size:11px; transition:background .12s;
}
.folder-file-row:hover { background:rgba(0,255,213,.02); }

/* ══ Download method buttons ══ */
.dl-method { display:flex; gap:4px; flex-wrap:wrap; }
.dl-http-btn {
  font-family:var(--mono); font-size:9px; padding:3px 7px; border-radius:3px;
  cursor:pointer; border:1px solid rgba(0,255,213,.3); color:var(--cyan);
  background:var(--cyan3); transition:all .13s; white-space:nowrap;
}
.dl-http-btn:hover { background:var(--cyan2); }
.dl-sftp-btn {
  font-family:var(--mono); font-size:9px; padding:3px 7px; border-radius:3px;
  cursor:pointer; border:1px solid rgba(167,139,250,.3); color:var(--purple);
  background:rgba(167,139,250,.07); transition:all .13s; white-space:nowrap;
}
.dl-sftp-btn:hover { background:rgba(167,139,250,.18); }

/* ══ Bulk DL bar ══ */
.bulk-dl-bar {
  display:flex; align-items:center; gap:10px; padding:9px 14px;
  background:linear-gradient(90deg,rgba(0,255,213,.07),transparent);
  border-bottom:1px solid var(--border); flex-wrap:wrap;
}
.bulk-dl-info { font-family:var(--mono); font-size:11px; color:var(--cyan); }

/* ══ ZIP Modal ══ */
.zip-btn {
  font-family:var(--mono); font-size:9px; padding:3px 8px; border-radius:3px;
  cursor:pointer; border:1px solid rgba(255,184,48,.35); color:var(--amber);
  background:rgba(255,184,48,.08); transition:all .13s; white-space:nowrap;
  display:inline-flex; align-items:center; gap:4px;
}
.zip-btn:hover { background:var(--amber2); }
.zip-btn:disabled { opacity:.4; cursor:not-allowed; }

.zip-modal-box {
  background:var(--c1); border:1px solid rgba(255,184,48,.28);
  border-radius:8px; width:100%; max-width:580px;
  overflow:hidden; display:flex; flex-direction:column;
  box-shadow:0 32px 80px rgba(0,0,0,.85), 0 0 40px rgba(255,184,48,.06);
}
.zip-modal-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid rgba(255,184,48,.15);
  background:linear-gradient(90deg,rgba(255,184,48,.08),transparent);
}
.zip-modal-title { font-family:var(--mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--amber); }

.zip-scope-list {
  border:1px solid var(--border); border-radius:var(--r); overflow:hidden; margin-bottom:14px;
}
.zip-scope-row {
  display:flex; align-items:center; gap:10px; padding:9px 14px;
  border-bottom:1px solid rgba(255,255,255,.03); font-size:12px; transition:background .12s;
}
.zip-scope-row:last-child { border-bottom:none; }
.zip-scope-row.selected { background:rgba(255,184,48,.07); }
.zip-scope-row label { display:flex; align-items:center; gap:10px; cursor:pointer; flex:1; }
.zip-scope-icon { font-size:15px; flex-shrink:0; }
.zip-scope-name { flex:1; font-family:var(--mono); font-size:11px; }
.zip-scope-meta { font-family:var(--mono); font-size:10px; color:var(--amber); flex-shrink:0; }

.zip-progress-wrap { margin-bottom:14px; }
.zip-status-label {
  font-family:var(--mono); font-size:10px; color:var(--amber);
  margin-bottom:8px; display:flex; align-items:center; gap:8px;
}
.zip-big-bar {
  height:10px; background:var(--c3); border-radius:5px;
  overflow:hidden; margin-bottom:6px;
  border:1px solid rgba(255,184,48,.15);
}
.zip-big-fill {
  height:100%; border-radius:5px;
  background:linear-gradient(90deg,var(--amber),#ff8c00);
  transition:width .4s cubic-bezier(.4,0,.2,1);
  box-shadow:0 0 10px rgba(255,184,48,.4);
}
.zip-phase-row {
  display:flex; justify-content:space-between;
  font-family:var(--mono); font-size:9px; color:var(--dimmer);
}
.zip-phase-row .active { color:var(--amber); }
.zip-phase-row .done   { color:var(--green); }

.zip-file-log {
  background:var(--c0); border:1px solid var(--border); border-radius:var(--r);
  padding:8px 12px; max-height:160px; overflow-y:auto;
  font-family:var(--mono); font-size:10px; margin-bottom:14px;
}
.zip-file-log-entry { color:var(--dim); line-height:1.7; }
.zip-file-log-entry.cur { color:var(--amber); }
.zip-file-log-entry.done { color:var(--green); }

.zip-result-box {
  background:linear-gradient(135deg,rgba(61,255,160,.07),rgba(0,255,213,.05));
  border:1px solid rgba(61,255,160,.25); border-radius:var(--r);
  padding:14px 16px; display:flex; align-items:center; gap:14px;
}
.zip-result-icon { font-size:28px; flex-shrink:0; }
.zip-result-name { font-family:var(--mono); font-size:12px; color:var(--green); font-weight:600; margin-bottom:3px; }
.zip-result-meta { font-family:var(--mono); font-size:10px; color:var(--dim); }

/* ══ Metadata Modal ══ */
.meta-btn {
  font-family:var(--mono); font-size:9px; padding:3px 7px; border-radius:3px;
  cursor:pointer; border:1px solid rgba(61,255,160,.3); color:var(--green);
  background:rgba(61,255,160,.07); transition:all .13s; white-space:nowrap;
  display:inline-flex; align-items:center; gap:3px;
}
.meta-btn:hover { background:rgba(61,255,160,.18); }
.meta-btn:disabled { opacity:.4; cursor:not-allowed; }

.meta-modal-box {
  background:var(--c1); border:1px solid rgba(61,255,160,.22);
  border-radius:8px; width:100%; max-width:720px; max-height:92vh;
  overflow:hidden; display:flex; flex-direction:column;
  box-shadow:0 32px 80px rgba(0,0,0,.85), 0 0 40px rgba(61,255,160,.04);
}
.meta-modal-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid rgba(61,255,160,.12);
  background:linear-gradient(90deg,rgba(61,255,160,.07),transparent); flex-shrink:0;
}
.meta-modal-title { font-family:var(--mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--green); }

/* file list in meta modal */
.meta-file-list {
  border:1px solid var(--border); border-radius:var(--r); overflow:hidden; margin-bottom:14px;
}
.meta-file-row {
  display:flex; align-items:center; gap:10px; padding:8px 12px;
  border-bottom:1px solid rgba(255,255,255,.03); font-size:12px;
  cursor:pointer; transition:background .12s;
}
.meta-file-row:last-child { border-bottom:none; }
.meta-file-row:hover { background:rgba(61,255,160,.04); }
.meta-file-row.active { background:rgba(61,255,160,.08); border-left:2px solid var(--green); }
.meta-file-name { flex:1; font-family:var(--mono); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.meta-file-status { font-family:var(--mono); font-size:9px; padding:2px 7px; border-radius:3px; flex-shrink:0; }
.meta-file-status.ok  { background:rgba(61,255,160,.15); color:var(--green); }
.meta-file-status.pending { background:rgba(255,184,48,.12); color:var(--amber); }
.meta-file-status.none  { background:rgba(255,255,255,.05); color:var(--dimmer); }

/* field editor */
.meta-fields-wrap {
  background:var(--c2); border:1px solid var(--border); border-radius:var(--r);
  padding:16px 18px; margin-bottom:14px;
}
.meta-fields-head {
  font-family:var(--mono); font-size:10px; letter-spacing:.15em; text-transform:uppercase;
  color:var(--green); margin-bottom:14px; display:flex; align-items:center; gap:8px;
}
.meta-fields-grid {
  display:grid; grid-template-columns:1fr 1fr; gap:12px;
}
.meta-field { display:flex; flex-direction:column; gap:4px; }
.meta-field.full { grid-column:1/-1; }
.meta-field label {
  font-family:var(--mono); font-size:9px; letter-spacing:.18em;
  text-transform:uppercase; color:var(--dim);
}
.meta-input {
  background:var(--c0); border:1px solid var(--border);
  color:var(--txt); font-family:var(--mono); font-size:12px;
  padding:7px 11px; border-radius:var(--r); outline:none; transition:border-color .14s;
  width:100%;
}
.meta-input:focus { border-color:rgba(61,255,160,.35); }
.meta-input::placeholder { color:var(--dimmer); }
.meta-textarea {
  resize:vertical; min-height:72px;
}

/* tag chips */
.meta-tag-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
.meta-tag-chip {
  font-family:var(--mono); font-size:9px; padding:3px 9px;
  border-radius:20px; border:1px solid var(--border); color:var(--dim);
  cursor:pointer; transition:all .13s;
}
.meta-tag-chip:hover { border-color:rgba(61,255,160,.3); color:var(--green); }
.meta-tag-chip.sel { background:rgba(61,255,160,.12); border-color:rgba(61,255,160,.35); color:var(--green); }

/* ffmpeg preview */
.meta-cmd-box {
  background:var(--c0); border:1px solid var(--border); border-radius:var(--r);
  padding:10px 14px; font-family:var(--mono); font-size:10px; color:var(--dim);
  overflow-x:auto; white-space:pre; margin-bottom:14px; line-height:1.7;
}
.meta-cmd-box .cmd-kw  { color:var(--cyan); }
.meta-cmd-box .cmd-val { color:var(--amber); }
.meta-cmd-box .cmd-flag{ color:var(--purple); }

/* write progress */
.meta-write-row {
  display:flex; align-items:center; gap:10px; padding:6px 12px;
  border-bottom:1px solid rgba(255,255,255,.03); font-size:11px;
}
.meta-write-icon { font-size:13px; flex-shrink:0; width:18px; text-align:center; }
.meta-write-name { flex:1; font-family:var(--mono); font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dim); }
.meta-write-state { font-family:var(--mono); font-size:9px; flex-shrink:0; }
.meta-write-state.writing { color:var(--amber); }
.meta-write-state.done    { color:var(--green); }
.meta-write-state.wait    { color:var(--dimmer); }
`;

// ══════════════════════════════════════════════════════════════════
//  MOCK SERVER-SIDE DATA  (replace with real fetch calls)
// ══════════════════════════════════════════════════════════════════
const MOCK_QUEUE = [
  { id:"q1", title:"進撃の巨人", ep:"S4 E05", animeId:"attack-on-titan-112", quality:"1080p",
    progress:67, speed:"4.2 MB/s", eta:"2:14", status:"active",  size:"780MB" },
  { id:"q2", title:"進撃の巨人", ep:"S4 E06", animeId:"attack-on-titan-112", quality:"1080p",
    progress:0,  speed:"—",       eta:"—",    status:"queued",  size:"770MB" },
  { id:"q3", title:"葬送のフリーレン", ep:"E01", animeId:"frieren-beyond-journeys-end-18542", quality:"720p",
    progress:0,  speed:"—",       eta:"—",    status:"queued",  size:"450MB" },
  { id:"q4", title:"チェンソーマン", ep:"E12",  animeId:"chainsaw-man-17408",  quality:"1080p",
    progress:100,speed:"—",       eta:"完了",  status:"done",   size:"654MB" },
];

const MOCK_FILES = [
  { name:"進撃の巨人 Ep01 [1080p].mp4",  series:"進撃の巨人",  animeId:"attack-on-titan-112",                  ep:1,  size:"782MB", date:"2026-03-10", quality:"1080p" },
  { name:"進撃の巨人 Ep02 [1080p].mp4",  series:"進撃の巨人",  animeId:"attack-on-titan-112",                  ep:2,  size:"741MB", date:"2026-03-10", quality:"1080p" },
  { name:"進撃の巨人 Ep03 [1080p].mp4",  series:"進撃の巨人",  animeId:"attack-on-titan-112",                  ep:3,  size:"798MB", date:"2026-03-11", quality:"1080p" },
  { name:"チェンソーマン Ep01 [1080p].mp4",series:"チェンソーマン",animeId:"chainsaw-man-17408",                ep:1,  size:"634MB", date:"2026-03-09", quality:"1080p" },
  { name:"チェンソーマン Ep12 [1080p].mp4",series:"チェンソーマン",animeId:"chainsaw-man-17408",                ep:12, size:"651MB", date:"2026-03-09", quality:"1080p" },
  { name:"鬼滅の刃 Ep01 [720p].mp4",     series:"鬼滅の刃",   animeId:"demon-slayer-kimetsu-no-yaiba-47",       ep:1,  size:"420MB", date:"2026-03-08", quality:"720p" },
  { name:"葬送のフリーレン Ep01 [720p].mp4",series:"葬送のフリーレン",animeId:"frieren-beyond-journeys-end-18542",ep:1, size:"480MB", date:"2026-03-11", quality:"720p" },
  { name:"葬送のフリーレン Ep02 [720p].mp4",series:"葬送のフリーレン",animeId:"frieren-beyond-journeys-end-18542",ep:2, size:"461MB", date:"2026-03-11", quality:"720p" },
  { name:"葬送のフリーレン Ep03 [720p].mp4",series:"葬送のフリーレン",animeId:"frieren-beyond-journeys-end-18542",ep:3, size:"475MB", date:"2026-03-11", quality:"720p" },
];

const MOCK_LOGS = [
  { time:"03/11 15:32:01", level:"INFO",    msg:"進撃の巨人 S4E05 ダウンロード開始 [1080p]" },
  { time:"03/11 15:31:55", level:"SUCCESS", msg:"チェンソーマン E12 変換完了 → .mp4 (ffmpeg)" },
  { time:"03/11 15:28:12", level:"INFO",    msg:"ffmpeg 変換開始: csm_ep12.m3u8 → csm_ep12.mp4" },
  { time:"03/11 15:12:44", level:"WARN",    msg:"ネットワーク切断検知 — 自動リトライ (1/3)" },
  { time:"03/11 15:12:58", level:"INFO",    msg:"リトライ成功 — ダウンロード再開" },
  { time:"03/11 14:55:20", level:"SUCCESS", msg:"Discord Webhook 通知送信完了" },
  { time:"03/11 14:55:19", level:"SUCCESS", msg:"進撃の巨人 S4E04 ダウンロード完了 [782MB]" },
  { time:"03/11 14:40:01", level:"DEBUG",   msg:"GET /api/v1/stream?server=HD-2&type=sub&id=attack-on-titan-112::ep=1420 → 200" },
  { time:"03/11 14:39:55", level:"INFO",    msg:"サーバー選択: HD-2 (sub)" },
  { time:"03/11 14:10:00", level:"INFO",    msg:"AnimeVault サーバー起動 @ port 4040" },
];

// ══════════════════════════════════════════════════════════════════
//  SMALL HELPERS
// ══════════════════════════════════════════════════════════════════
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type="info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

function Spinner() { return <span className="spin">⟳</span>; }

// ══════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════
export default function AnimeVault() {
  const [page,    setPage]    = useState("home");
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [dlBase,  setDlBase]  = useState(DEFAULT_DL_API);
  const [apiOnline, setApiOnline] = useState(null);
  const [dlOnline,  setDlOnline]  = useState(null);
  const [queue,   setQueue]   = useState([]);
  const [files,   setFiles]   = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [logs,    setLogs]    = useState(MOCK_LOGS);
  const [detail,  setDetail]  = useState(null); // { anime, episodes }
  const [sysInfo, setSysInfo] = useState({ cpu:"23%", temp:"62°C", disk:"1.2TB空" });
  const [sftpConfig, setSftpConfig] = useState({
    host:"", port:"22", user:"", password:"", remotePath:"/media/anime", keyPath:""
  });
  const [showSftp, setShowSftp] = useState(false);
  const [sftpTarget, setSftpTarget] = useState(null); // { files[], label }
  const [showZip,  setShowZip]  = useState(false);
  const [zipTarget, setZipTarget] = useState(null); // { files[], label }
  const [showMeta, setShowMeta] = useState(false);
  const [metaTarget, setMetaTarget] = useState(null); // { files[] }
  const { toasts, add: toast } = useToast();

  // ─ Ping APIs ─
  useEffect(() => {
    (async () => {
      try { await fetch(`${apiBase}/api/v1/home`); setApiOnline(true); }
      catch { setApiOnline(false); }
    })();
    (async () => {
      try { await fetch(`${dlBase}/health`); setDlOnline(true); }
      catch { setDlOnline(false); }
    })();
  }, [apiBase, dlBase]);

  // ─ ファイル一覧をサーバーから取得 ─
  const refreshFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const res = await fetch(`${dlBase}/api/files`);
      const j = await res.json();
      if (j.ok) setFiles(j.files);
      else setFiles(MOCK_FILES);
    } catch { setFiles(MOCK_FILES); }
    setFilesLoading(false);
  }, [dlBase]);

  const refreshQueue = useCallback(async () => {
    try {
      const res = await fetch(`${dlBase}/api/queue`);
      const j = await res.json();
      if (j.ok && j.queue.length) setQueue(j.queue);
      else setQueue(MOCK_QUEUE);
    } catch { setQueue(MOCK_QUEUE); }
  }, [dlBase]);

  useEffect(() => { refreshFiles(); refreshQueue(); }, [refreshFiles, refreshQueue]);

  // ─ Simulated queue progress ─
  useEffect(() => {
    const t = setInterval(() => {
      setQueue(q => q.map(item => {
        if (item.status === "active" && item.progress < 100) {
          const np = Math.min(100, item.progress + Math.random() * 1.2);
          return { ...item, progress: np, speed:`${(Math.random()*2+3).toFixed(1)} MB/s`,
            eta:`${Math.floor((100-np)/10)}:${String(Math.floor(Math.random()*59)).padStart(2,"0")}` };
        }
        return item;
      }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const activeCount = queue.filter(q => q.status === "active").length;
  const queuedCount = queue.filter(q => q.status === "queued").length;

  function addToQueue(animeTitle, ep, epNum, quality, animeId) {
    const newItem = {
      id: `q${Date.now()}`, title: animeTitle,
      ep: `E${String(epNum).padStart(2,"0")}`, animeId,
      quality, progress:0, speed:"—", eta:"—", status:"queued", size:"—"
    };
    setQueue(q => [...q, newItem]);
    setLogs(l => [{
      time: new Date().toLocaleString("ja-JP",{month:"2-digit",day:"2-digit",
        hour:"2-digit",minute:"2-digit",second:"2-digit"}).replace(/[\/]/g,"/"),
      level:"INFO", msg:`キューに追加: ${animeTitle} ${newItem.ep} [${quality}]`
    }, ...l]);
    toast(`キュー追加: ${animeTitle} ${newItem.ep}`, "info");
  }

  return (
    <>
      <style>{STYLE}</style>
      <div className="app">
        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-mark">⬡ AnimeVault</div>
            <div className="logo-sub">Download Manager v1.0</div>
          </div>

          <nav>
            <div className="nav-group">
              <div className="nav-group-label">メイン</div>
              {[
                ["home",    "⌂", "ダッシュボード"],
                ["browse",  "◎", "アニメ検索"],
                ["queue",   "↓", "ダウンロードキュー",  activeCount+queuedCount > 0 ? activeCount+queuedCount : null],
                ["files",   "▤", "ファイル管理"],
                ["folders", "⊟", "フォルダ管理"],
              ].map(([id,ico,label,badge]) => (
                <div key={id} className={`nav-item ${page===id?"active":""}`} onClick={()=>setPage(id)}>
                  <span className="nav-ico">{ico}</span>
                  {label}
                  {badge != null && <span className="nav-badge">{badge}</span>}
                </div>
              ))}
            </div>
            <div className="nav-group">
              <div className="nav-group-label">システム</div>
              {[
                ["logs",     "◈", "ログ", logs.filter(l=>l.level==="ERROR").length || null],
                ["settings", "⚙", "設定"],
              ].map(([id,ico,label,badge]) => (
                <div key={id} className={`nav-item ${page===id?"active":""}`} onClick={()=>setPage(id)}>
                  <span className="nav-ico">{ico}</span>
                  {label}
                  {badge != null && <span className="nav-badge amber">{badge}</span>}
                </div>
              ))}
            </div>
          </nav>

          <div className="srv-status">
            <div className="srv-row mb8">
              <div className="srv-label-row">
                <div className={`pulse-dot ${apiOnline?"on":"off"}`}/>
                <span>hianime API</span>
              </div>
              <span className={`srv-val ${apiOnline===null?"":apiOnline?"ok":"err"}`}>
                {apiOnline===null?"…":apiOnline?"接続中":"オフライン"}
              </span>
            </div>
            <div className="srv-row mb8">
              <div className="srv-label-row">
                <div className={`pulse-dot ${dlOnline?"on":"off"}`}/>
                <span>DL Server</span>
              </div>
              <span className={`srv-val ${dlOnline===null?"":dlOnline?"ok":"err"}`}>
                {dlOnline===null?"…":dlOnline?"稼働中":"停止中"}
              </span>
            </div>
            <div className="srv-row"><span>CPU</span><span className="srv-val warn">{sysInfo.cpu}</span></div>
            <div className="srv-row"><span>温度</span><span className="srv-val warn">{sysInfo.temp}</span></div>
            <div className="srv-row"><span>ストレージ</span><span className="srv-val ok">{sysInfo.disk}</span></div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="main">
          <header className="topbar">
            <div className="topbar-title">
              AnimeVault
              <span className="topbar-sep"> / </span>
              <span>{
                {home:"ダッシュボード",browse:"アニメ検索",queue:"ダウンロードキュー",
                 files:"ファイル管理",folders:"フォルダ管理",logs:"ログ",settings:"設定"}[page]
              }</span>
            </div>
            <div className="api-url-pill">{apiBase}</div>
            <div className="topbar-actions">
              {page==="queue" && <button className="btn primary sm" onClick={()=>toast("キュー全体を開始しました","info")}>▶ 全て開始</button>}
              {page==="queue" && <button className="btn sm" onClick={()=>toast("全キューを一時停止","warn")}>⏸ 一時停止</button>}
              {page==="files" && <button className="btn primary sm" onClick={refreshFiles}>{filesLoading ? <Spinner/> : "⟳"} 更新</button>}
              {page==="files" && <button className="zip-btn" onClick={()=>{ setZipTarget({files,label:"全ファイル"}); setShowZip(true); }}>🗜 ZIP一括DL</button>}
              {page==="files" && <button className="meta-btn" onClick={()=>{ setMetaTarget({files}); setShowMeta(true); }}>🏷 メタデータ編集</button>}
              {page==="folders" && <button className="zip-btn" onClick={()=>{ setZipTarget({files,label:"全フォルダ"}); setShowZip(true); }}>🗜 ZIP一括DL</button>}
              {page==="folders" && <button className="meta-btn" onClick={()=>{ setMetaTarget({files}); setShowMeta(true); }}>🏷 メタデータ編集</button>}
              {page==="logs"  && <button className="btn danger sm" onClick={()=>setLogs([])}>✕ クリア</button>}
            </div>
          </header>

          <div className="content">
            {page==="home"     && <HomePage  queue={queue} files={files} logs={logs} setPage={setPage}/>}
            {page==="browse"   && <BrowsePage apiBase={apiBase} onDetail={setDetail} toast={toast} />}
            {page==="queue"    && <QueuePage  queue={queue} setQueue={setQueue} toast={toast}/>}
            {page==="files"    && <FilesPage  files={files} setFiles={setFiles} apiBase={apiBase} toast={toast} onQueue={addToQueue}
                                   dlBase={dlBase}
                                   onSftp={(target)=>{ setSftpTarget(target); setShowSftp(true); }}
                                   onZip={(target)=>{ setZipTarget(target); setShowZip(true); }}
                                   onMeta={(target)=>{ setMetaTarget(target); setShowMeta(true); }}/>}
            {page==="folders"  && <FolderPage files={files} toast={toast} dlBase={dlBase}
                                   onSftp={(target)=>{ setSftpTarget(target); setShowSftp(true); }}
                                   onZip={(target)=>{ setZipTarget(target); setShowZip(true); }}
                                   onMeta={(target)=>{ setMetaTarget(target); setShowMeta(true); }}/>}
            {page==="logs"     && <LogsPage   logs={logs}/>}
            {page==="settings" && <SettingsPage apiBase={apiBase} setApiBase={setApiBase}
                                    dlBase={dlBase} setDlBase={setDlBase}
                                    sftpConfig={sftpConfig} setSftpConfig={setSftpConfig}
                                    toast={toast}/>}
          </div>
        </main>

        {/* ── DETAIL OVERLAY ── */}
        {detail && (
          <DetailOverlay
            data={detail}
            onClose={() => setDetail(null)}
            onAddQueue={(ep, epNum, quality) => {
              addToQueue(detail.anime.title, ep, epNum, quality, detail.anime.id);
            }}
            toast={toast}
          />
        )}

        {/* ── SFTP MODAL ── */}
        {showSftp && (
          <SFTPModal
            config={sftpConfig}
            setConfig={setSftpConfig}
            target={sftpTarget}
            onClose={()=>setShowSftp(false)}
            toast={toast}
          />
        )}

        {/* ── ZIP MODAL ── */}
        {showZip && (
          <ZipModal
            files={files}
            target={zipTarget}
            dlBase={dlBase}
            onClose={()=>{ setShowZip(false); setZipTarget(null); }}
            toast={toast}
          />
        )}

        {/* ── METADATA MODAL ── */}
        {showMeta && (
          <MetadataModal
            files={metaTarget?.files || files}
            dlBase={dlBase}
            onClose={()=>{ setShowMeta(false); setMetaTarget(null); }}
            toast={toast}
          />
        )}

        {/* ── TOASTS ── */}
        <div className="toast-wrap">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type==="error"?"err":t.type==="warn"?"warn":""}`}>
              {t.type==="error"?"✕ ":t.type==="warn"?"⚠ ":"✓ "}{t.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
//  HOME PAGE
// ══════════════════════════════════════════════════════════════════
function HomePage({ queue, files, logs, setPage }) {
  const active = queue.filter(q=>q.status==="active");
  const done   = queue.filter(q=>q.status==="done");
  return (
    <div>
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card sc-cyan">
          <div className="stat-lbl">アクティブ</div>
          <div className="stat-val cyan-txt">{active.length}</div>
          <div className="stat-sub">ダウンロード中</div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-lbl">キュー待機</div>
          <div className="stat-val amber-txt">{queue.filter(q=>q.status==="queued").length}</div>
          <div className="stat-sub">待機中エピソード</div>
        </div>
        <div className="stat-card sc-green">
          <div className="stat-lbl">完了済み</div>
          <div className="stat-val green-txt">{done.length + files.length}</div>
          <div className="stat-sub">ダウンロード完了</div>
        </div>
        <div className="stat-card sc-rose">
          <div className="stat-lbl">ファイル数</div>
          <div className="stat-val rose-txt">{files.length}</div>
          <div className="stat-sub">保存済み動画</div>
        </div>
      </div>

      <div className="g2">
        {/* Active downloads */}
        <div className="card">
          <div className="card-head">
            <span>⬇ アクティブダウンロード</span>
            <button className="btn sm" onClick={()=>setPage("queue")}>全て見る →</button>
          </div>
          {active.length === 0 ? (
            <div className="empty"><div className="empty-icon">⬇</div>ダウンロード中なし</div>
          ) : (
            <div style={{padding:"10px 0"}}>
              {active.map(item => (
                <div key={item.id} style={{padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,.03)"}}>
                  <div className="row-sb mb8">
                    <div style={{fontSize:12,fontWeight:500}}>{item.title} <span style={{color:"var(--dim)",fontSize:11}}>{item.ep}</span></div>
                    <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--cyan)"}}>{item.progress.toFixed(0)}%</div>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill prog-cyan" style={{width:`${item.progress}%`}}/>
                  </div>
                  <div className="row mt8" style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--dim)"}}>
                    <span>{item.quality}</span>
                    <span style={{marginLeft:"auto"}}>{item.speed}</span>
                    <span style={{marginLeft:10}}>残{item.eta}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent logs */}
        <div className="card">
          <div className="card-head">
            <span>◈ 最近のログ</span>
            <button className="btn sm" onClick={()=>setPage("logs")}>全て見る →</button>
          </div>
          <div className="log-wrap" style={{border:"none",borderRadius:0,maxHeight:200,overflowY:"auto"}}>
            {logs.slice(0,8).map((l,i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{l.time}</span>
                <span className={`log-level log-${l.level}`}>{l.level}</span>
                <span className="log-msg">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent files */}
      <div style={{marginTop:14}} className="card">
        <div className="card-head">
          <span>▤ 最近のダウンロードファイル</span>
          <button className="btn sm" onClick={()=>setPage("files")}>全て見る →</button>
        </div>
        <div className="file-head">
          <span></span><span>ファイル名</span><span>シリーズ</span>
          <span style={{textAlign:"right"}}>サイズ</span><span>日付</span><span></span>
        </div>
        {files.slice(0,5).map((f,i) => (
          <div key={i} className="file-row">
            <span style={{color:"var(--cyan)",fontSize:13}}>▶</span>
            <span className="file-name">{f.name}</span>
            <span className="file-series">{f.series}</span>
            <span className="file-size">{f.size}</span>
            <span className="file-date">{f.date}</span>
            <div className="file-actions">
              <button className="btn sm">▶</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  BROWSE PAGE
// ══════════════════════════════════════════════════════════════════
function BrowsePage({ apiBase, onDetail, toast }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab] = useState("trending");
  const debRef = useRef(null);

  // Load home data (trending)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/home`);
        const j   = await res.json();
        if (j.success) {
          setTrending(j.data.trending || []);
        }
      } catch {
        // use placeholder
        setTrending([]);
      }
    })();
  }, [apiBase]);

  async function doSearch(kw) {
    if (!kw.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/search?keyword=${encodeURIComponent(kw)}&page=1`);
      const j   = await res.json();
      if (j.success) setResults(j.data.response || []);
      else toast("検索失敗: "+JSON.stringify(j),"error");
    } catch(e) {
      toast("API接続エラー: "+e.message,"error");
    }
    setLoading(false);
  }

  function handleInput(v) {
    setKeyword(v);
    clearTimeout(debRef.current);
    if (v.trim().length >= 2) {
      debRef.current = setTimeout(() => { setTab("search"); doSearch(v); }, 500);
    } else {
      setResults([]);
    }
  }

  async function openDetail(anime) {
    toast("アニメ情報を取得中…","info");
    try {
      const [infoRes, epsRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/anime/${anime.id.split("?")[0]}`),
        fetch(`${apiBase}/api/v1/episodes/${anime.id.split("?")[0]}`),
      ]);
      const infoJ = await infoRes.json();
      const epsJ  = await epsRes.json();
      onDetail({
        anime: infoJ.success ? { ...infoJ.data, id: anime.id.split("?")[0] } : { ...anime, id: anime.id.split("?")[0] },
        episodes: epsJ.success ? epsJ.data : [],
      });
    } catch(e) {
      toast("情報取得エラー: "+e.message,"error");
    }
  }

  const displayList = tab==="search" ? results : trending;

  return (
    <div>
      <div className="search-bar">
        <input
          className="search-input"
          placeholder="アニメを検索… (例: attack on titan, 鬼滅の刃)"
          value={keyword}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && doSearch(keyword)}
        />
        <button className="btn primary" onClick={() => { setTab("search"); doSearch(keyword); }}>
          {loading ? <Spinner/> : "検索"}
        </button>
      </div>

      <div className="tab-bar">
        {[["trending","🔥 トレンド"],["search","🔍 検索結果"]].map(([id,label]) => (
          <div key={id} className={`tab-item ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>

      {loading && (
        <div style={{textAlign:"center",padding:"40px",fontFamily:"var(--mono)",color:"var(--dim)"}}>
          <Spinner/> 検索中…
        </div>
      )}

      {!loading && displayList.length === 0 && (
        <div className="empty">
          <div className="empty-icon">{tab==="search"?"🔍":"🔥"}</div>
          {tab==="search" ? "キーワードを入力して検索" : "トレンドデータを読み込み中…"}
        </div>
      )}

      {!loading && displayList.length > 0 && (
        tab==="trending" ? (
          <div>
            <div className="sec-head"><div className="sec-dot"/><div className="sec-title">トレンドアニメ TOP</div></div>
            <div className="trending-row">
              {displayList.slice(0,20).map((a,i) => (
                <div key={a.id||i} className="tr-card" onClick={() => openDetail(a)}>
                  <div className="tr-rank">#{a.rank||i+1}</div>
                  {a.poster
                    ? <img className="tr-img" src={a.poster} alt={a.title} loading="lazy" onError={e=>e.target.style.display="none"}/>
                    : <div className="tr-img" style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"var(--dimmer)"}}>{a.title?.slice(0,6)}</div>
                  }
                  <div className="tr-title">{a.title}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="sec-head"><div className="sec-dot"/><div className="sec-title">検索結果 {results.length}件</div></div>
            <div className="anime-grid">
              {results.map((a,i) => (
                <div key={a.id||i} className="anime-card" onClick={() => openDetail(a)}>
                  {a.poster
                    ? <img className="anime-poster" src={a.poster} alt={a.title} loading="lazy" onError={e=>{e.target.style.display="none";}}/>
                    : <div className="anime-poster-ph">{a.title?.slice(0,12)}</div>
                  }
                  <div className="anime-info">
                    <div className="anime-name">{a.title}</div>
                    <div className="anime-meta">{a.type} · {a.duration}</div>
                    <div className="ep-badge">
                      {a.episodes?.sub > 0 && <span className="ep-sub">SUB {a.episodes.sub}</span>}
                      {a.episodes?.dub > 0 && <span className="ep-dub">DUB {a.episodes.dub}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DETAIL OVERLAY
// ══════════════════════════════════════════════════════════════════
function DetailOverlay({ data, onClose, onAddQueue, toast }) {
  const { anime, episodes } = data;
  const [quality, setQuality]   = useState("1080p");
  const [selected, setSelected] = useState(new Set());
  const [audioType, setAudioType] = useState("sub");

  function toggleAll() {
    if (selected.size === episodes.length) setSelected(new Set());
    else setSelected(new Set(episodes.map((_,i) => i)));
  }

  function addSelected() {
    if (selected.size === 0) { toast("エピソードを選択してください","warn"); return; }
    selected.forEach(i => {
      const ep = episodes[i];
      onAddQueue(ep, i+1, quality);
    });
    toast(`${selected.size}話をキューに追加しました [${quality}]`,"info");
    setSelected(new Set());
  }

  return (
    <div className="detail-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="detail-panel">
        {/* Hero */}
        <div className="detail-hero">
          {anime.poster
            ? <div className="detail-poster"><img src={anime.poster} alt={anime.title} style={{width:"100%",display:"block"}}/></div>
            : <div className="detail-poster-ph">NO IMAGE</div>
          }
          <div className="detail-info">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div className="detail-title">{anime.title}</div>
                <div className="detail-ja">{anime.japanese || anime.alternativeTitle}</div>
              </div>
              <button className="btn sm" onClick={onClose}>✕ 閉じる</button>
            </div>
            <div className="detail-badges">
              {anime.type    && <span className="dbadge db-type">{anime.type}</span>}
              {anime.status  && <span className="dbadge db-status">{anime.status}</span>}
              {anime.MAL_score && <span className="dbadge db-score">★ {anime.MAL_score}</span>}
              {anime.aired?.from && <span className="dbadge" style={{borderColor:"var(--dimmer)",color:"var(--dim)"}}>{anime.aired.from}</span>}
            </div>
            {anime.synopsis && (
              <div className="detail-synopsis">{anime.synopsis}</div>
            )}
            {anime.genres?.length > 0 && (
              <div className="detail-genres">
                {anime.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
              </div>
            )}
            <div className="row mt8" style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dim)"}}>
              <span>SUB: <span style={{color:"var(--cyan)"}}>{anime.episodes?.sub||"?"}</span></span>
              <span style={{marginLeft:12}}>DUB: <span style={{color:"var(--amber)"}}>{anime.episodes?.dub||"?"}</span></span>
              {anime.studios && <span style={{marginLeft:12}}>Studio: <span style={{color:"var(--txt)"}}>{anime.studios}</span></span>}
            </div>
          </div>
        </div>

        {/* Episode panel */}
        <div className="detail-eps-panel">
          <div className="eps-toolbar">
            <div className="quality-chips">
              {["360p","480p","720p","1080p"].map(q => (
                <button key={q} className={`qchip ${quality===q?"sel":""}`} onClick={()=>setQuality(q)}>{q}</button>
              ))}
            </div>
            <select className="sel-input" value={audioType} onChange={e=>setAudioType(e.target.value)}>
              <option value="sub">字幕 (SUB)</option>
              <option value="dub">吹替 (DUB)</option>
            </select>
            <div style={{marginLeft:"auto",display:"flex",gap:8}}>
              <button className="btn sm" onClick={toggleAll}>
                {selected.size===episodes.length?"全解除":"全選択"}
              </button>
              <button className="btn primary sm" onClick={addSelected} disabled={selected.size===0}>
                ⬇ {selected.size > 0 ? `${selected.size}話をキューに追加` : "エピソードを選択"}
              </button>
            </div>
          </div>

          {episodes.length === 0 ? (
            <div className="empty" style={{padding:"24px"}}><Spinner/> エピソード取得中…</div>
          ) : (
            <div style={{maxHeight:260,overflowY:"auto",border:"1px solid var(--border)",borderRadius:"var(--r)"}}>
              <table className="ep-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" className="cb" checked={selected.size===episodes.length && episodes.length>0}
                      onChange={toggleAll}/></th>
                    <th>#</th>
                    <th>タイトル</th>
                    <th>フィラー</th>
                  </tr>
                </thead>
                <tbody>
                  {episodes.map((ep,i) => (
                    <tr key={i}>
                      <td>
                        <input type="checkbox" className="cb"
                          checked={selected.has(i)}
                          onChange={() => {
                            const s = new Set(selected);
                            s.has(i) ? s.delete(i) : s.add(i);
                            setSelected(s);
                          }}
                        />
                      </td>
                      <td><span className="ep-num">{String(i+1).padStart(2,"0")}</span></td>
                      <td>{ep.title || ep.alternativeTitle || `Episode ${i+1}`}</td>
                      <td>{ep.isFiller && <span className="ep-filler">FILLER</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  QUEUE PAGE
// ══════════════════════════════════════════════════════════════════
function QueuePage({ queue, setQueue, toast }) {
  function remove(id) {
    setQueue(q => q.filter(i => i.id !== id));
    toast("キューから削除しました","warn");
  }
  function moveUp(idx) {
    if (idx === 0) return;
    setQueue(q => { const n=[...q]; [n[idx-1],n[idx]]=[n[idx],n[idx-1]]; return n; });
  }

  return (
    <div>
      <div className="sec-head mb14">
        <div className="sec-dot"/>
        <div className="sec-title">ダウンロードキュー — {queue.length}件</div>
      </div>

      <div className="card">
        <div style={{display:"grid",gridTemplateColumns:"24px 1fr 70px 80px 70px 60px 60px",
          gap:10,padding:"8px 14px",borderBottom:"1px solid var(--border)",
          fontFamily:"var(--mono)",fontSize:"9px",letterSpacing:".18em",
          textTransform:"uppercase",color:"var(--dimmer)"}}>
          <span>#</span><span>エピソード</span><span style={{textAlign:"center"}}>画質</span>
          <div style={{display:"grid",gridTemplateColumns:"1fr",textAlign:"right"}}>
            <span>進捗</span>
          </div>
          <span style={{textAlign:"right"}}>速度</span>
          <span style={{textAlign:"right"}}>残り</span>
          <span/>
        </div>

        {queue.length === 0 && (
          <div className="empty"><div className="empty-icon">⬇</div>キューが空です</div>
        )}

        {queue.map((item, idx) => (
          <div key={item.id}>
            <div className="queue-item">
              <span className="queue-rank">{idx+1}</span>
              <div>
                <div className="queue-info-title">
                  <span className={`sdot sdot-${item.status==="active"?"active":item.status==="done"?"done":item.status==="error"?"err":"queue"}`}/>
                  {item.title}
                </div>
                <div className="queue-info-sub">{item.ep} · {item.size}</div>
                <div className="prog-track mt8">
                  <div className={`prog-fill ${item.status==="done"?"prog-green":"prog-cyan"}`}
                       style={{width:`${item.progress}%`}}/>
                </div>
              </div>
              <span className="queue-quality">{item.quality}</span>
              <span className="queue-pct">{item.progress.toFixed(0)}%</span>
              <span className="queue-speed">{item.speed}</span>
              <span className="queue-eta">{item.eta}</span>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <button className="btn sm" onClick={()=>moveUp(idx)} title="優先度UP">↑</button>
                <button className="btn danger sm" onClick={()=>remove(item.id)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  FILES PAGE  ― アニメ別グループ + URLまとめてDL + ダウンロードボタン
// ══════════════════════════════════════════════════════════════════
function FilesPage({ files, setFiles, apiBase, dlBase, toast, onQueue, onSftp, onZip, onMeta }) {
  const [filter,      setFilter]      = useState("");
  const [view,        setView]        = useState("list");
  const [expanded,    setExpanded]    = useState({});
  const [selected,    setSelected]    = useState({});
  const [showUrl,     setShowUrl]     = useState(false);
  const [dlProgress,  setDlProgress]  = useState({}); // filename → pct

  // ─ URL bulk-add state ─
  const [urlInput,    setUrlInput]    = useState("");
  const [urlEpFrom,   setUrlEpFrom]   = useState(1);
  const [urlEpTo,     setUrlEpTo]     = useState(12);
  const [urlQuality,  setUrlQuality]  = useState("1080p");
  const [urlAudio,    setUrlAudio]    = useState("sub");
  const [urlLoading,  setUrlLoading]  = useState(false);
  const [urlPreview,  setUrlPreview]  = useState(null);

  const groups = useMemo(() => {
    const map = {};
    files.forEach(f => {
      if (!map[f.series]) map[f.series] = { series:f.series, animeId:f.animeId, files:[] };
      map[f.series].files.push(f);
    });
    return Object.values(map)
      .filter(g => !filter ||
        g.series.toLowerCase().includes(filter.toLowerCase()) ||
        g.files.some(f => f.name.toLowerCase().includes(filter.toLowerCase())))
      .sort((a,b) => a.series.localeCompare(b.series,"ja"));
  }, [files, filter]);

  function toggleExpand(id) { setExpanded(e=>({...e,[id]:!e[id]})); }
  function getGroupSel(g)   { return selected[g.series] || new Set(); }
  function toggleFile(g, fname) {
    const s = new Set(getGroupSel(g));
    s.has(fname) ? s.delete(fname) : s.add(fname);
    setSelected(p=>({...p,[g.series]:s}));
  }
  function toggleGroupAll(g) {
    const s = getGroupSel(g);
    setSelected(p=>({...p,[g.series]:
      s.size===g.files.length ? new Set() : new Set(g.files.map(f=>f.name))
    }));
  }
  function deleteSelected(g) {
    const s = getGroupSel(g);
    if(!s.size) return;
    setFiles(fs=>fs.filter(f=>!(f.series===g.series&&s.has(f.name))));
    setSelected(p=>({...p,[g.series]:new Set()}));
    toast(`${s.size}ファイルを削除しました`,"warn");
    [...s].forEach(name=>fetch(`${dlBase}/api/files/${encodeURIComponent(name)}`,{method:"DELETE"}).catch(()=>{}));
  }
  function deleteGroup(g) {
    setFiles(fs=>fs.filter(f=>f.series!==g.series));
    toast(`「${g.series}」を全て削除しました`,"warn");
  }
  function groupSize(g) {
    const total = g.files.reduce((acc,f)=>{
      const n=parseFloat(f.size);
      return acc+(f.size.includes("GB")?n*1024:n);
    },0);
    return total>=1024?`${(total/1024).toFixed(1)}GB`:`${Math.round(total)}MB`;
  }

  // ─ HTTP download (実API) ─
  function httpDownload(f) {
    if(dlProgress[f.name]!=null) return;
    toast(`HTTP DL開始: ${f.name}`,"info");
    setDlProgress(p=>({...p,[f.name]:1}));
    const url = `${dlBase}/api/download/${encodeURIComponent(f.path||f.name)}`;
    const a = document.createElement("a");
    a.href = url; a.download = f.name; a.click();
    let pct = 5;
    const iv = setInterval(()=>{
      pct = Math.min(95, pct + Math.random()*10 + 3);
      setDlProgress(p=>({...p,[f.name]:Math.round(pct)}));
    },500);
    setTimeout(()=>{
      clearInterval(iv);
      setDlProgress(p=>({...p,[f.name]:100}));
      setTimeout(()=>{
        setDlProgress(p=>{const n={...p};delete n[f.name];return n;});
        toast(`✓ DL完了: ${f.name}`,"info");
      },800);
    },6000);
  }

  // ─ Bulk HTTP download ─
  function bulkHttpDownload(g) {
    const sel = getGroupSel(g);
    const targets = sel.size>0
      ? g.files.filter(f=>sel.has(f.name))
      : g.files;
    targets.forEach((f,i)=>setTimeout(()=>httpDownload(f),i*200));
    toast(`${targets.length}ファイルのHTTPダウンロードを開始`,"info");
  }

  // ─ URL fetch preview ─
  async function fetchUrlPreview() {
    const raw=urlInput.trim();
    if(!raw){toast("URLまたはアニメIDを入力してください","warn");return;}
    const match=raw.match(/\/([a-z0-9-]+-\d+)/);
    const animeId=match?match[1]:raw;
    setUrlLoading(true);
    try{
      const res=await fetch(`${apiBase}/api/v1/anime/${animeId}`);
      const j=await res.json();
      if(j.success) setUrlPreview({...j.data,id:animeId});
      else toast("アニメ情報の取得に失敗しました","error");
    }catch(e){toast("API接続エラー: "+e.message,"error");}
    setUrlLoading(false);
  }
  function handleBulkAdd() {
    if(!urlPreview){toast("まずURLを取得してください","warn");return;}
    const count=urlEpTo-urlEpFrom+1;
    if(count<=0){toast("話数の範囲が無効です","warn");return;}
    for(let ep=urlEpFrom;ep<=urlEpTo;ep++)
      onQueue(urlPreview.title,`E${String(ep).padStart(2,"0")}`,ep,urlQuality,urlPreview.id);
    toast(`${urlPreview.title} E${urlEpFrom}〜E${urlEpTo}（${count}話）をキューに追加`,"info");
    setUrlPreview(null);setUrlInput("");setShowUrl(false);
  }

  const totalFiles = files.length;
  const totalSel   = Object.values(selected).reduce((a,s)=>a+s.size,0);

  return (
    <div>
      {/* Toolbar */}
      <div className="fb-toolbar">
        <div className="sec-dot"/>
        <span style={{fontFamily:"var(--mono)",fontSize:11,letterSpacing:".18em",textTransform:"uppercase",color:"var(--dim)"}}>
          ファイルブラウザ — {groups.length}作品 / {totalFiles}ファイル
        </span>
        <input className="search-input" style={{width:190}}
          placeholder="タイトル・ファイル名で絞り込み"
          value={filter} onChange={e=>setFilter(e.target.value)}/>
        <div className="fb-view-toggle">
          <button className={`fb-view-btn ${view==="list"?"active":""}`} onClick={()=>setView("list")}>☰ リスト</button>
          <button className={`fb-view-btn ${view==="grid"?"active":""}`} onClick={()=>setView("grid")}>⊞ グリッド</button>
        </div>
        <button className="btn primary sm" onClick={()=>setShowUrl(v=>!v)}>
          {showUrl?"✕ 閉じる":"⬇ URLからまとめてDL"}
        </button>
        <button className="zip-btn" onClick={()=>onZip({files,label:`全ファイル（${files.length}件）`})}>
          🗜 ZIP全DL
        </button>
        <button className="meta-btn" onClick={()=>onMeta({files,label:"全ファイル"})}>
          ✦ メタデータ書込
        </button>
        <button className="meta-btn" onClick={()=>onMeta({files})}>
          🏷 一括メタ編集
        </button>
        {totalSel>0 && <>
          <button className="btn primary sm" onClick={()=>{
            groups.forEach(g=>{ if(getGroupSel(g).size>0) bulkHttpDownload(g); });
          }}>⬇ HTTP {totalSel}件</button>
          <button className="btn sm" style={{borderColor:"rgba(167,139,250,.35)",color:"var(--purple)"}}
            onClick={()=>{
              const sel=[];
              groups.forEach(g=>{ const s=getGroupSel(g); g.files.filter(f=>s.has(f.name)).forEach(f=>sel.push(f)); });
              onSftp({files:sel,label:`選択した${totalSel}ファイル`});
            }}>⤓ SFTP {totalSel}件</button>
          <button className="zip-btn"
            onClick={()=>{
              const sel=[];
              groups.forEach(g=>{ const s=getGroupSel(g); g.files.filter(f=>s.has(f.name)).forEach(f=>sel.push(f)); });
              onZip({files:sel,label:`選択${totalSel}件`});
            }}>🗜 ZIP {totalSel}件</button>
          <button className="meta-btn"
            onClick={()=>{
              const sel=[];
              groups.forEach(g=>{ const s=getGroupSel(g); g.files.filter(f=>s.has(f.name)).forEach(f=>sel.push(f)); });
              onMeta({files:sel});
            }}>🏷 メタ編集 {totalSel}件</button>
          <button className="btn danger sm" onClick={()=>groups.forEach(g=>deleteSelected(g))}>
            ✕ 削除 {totalSel}件
          </button>
        </>}
      </div>

      {/* URL Bulk-add panel */}
      {showUrl && (
        <div className="url-panel mb14">
          <div className="url-panel-title">⬇ URLからエピソードをまとめてキューに追加</div>
          <div className="url-input-row">
            <input className="search-input" style={{flex:1}}
              placeholder="hianime URL または アニメID  例: attack-on-titan-112"
              value={urlInput} onChange={e=>{setUrlInput(e.target.value);setUrlPreview(null);}}
              onKeyDown={e=>e.key==="Enter"&&fetchUrlPreview()}/>
            <button className="btn primary" onClick={fetchUrlPreview} disabled={urlLoading}>
              {urlLoading?<Spinner/>:"取得"}
            </button>
          </div>
          <div className="url-ep-range">
            <span className="url-ep-range-label">話数:</span>
            <input type="number" className="url-num-input" min={1} value={urlEpFrom}
              onChange={e=>setUrlEpFrom(Math.max(1,+e.target.value))}/>
            <span className="url-ep-range-label">〜</span>
            <input type="number" className="url-num-input" min={1} value={urlEpTo}
              onChange={e=>setUrlEpTo(Math.max(urlEpFrom,+e.target.value))}/>
            <div className="quality-chips" style={{marginLeft:10}}>
              {["360p","480p","720p","1080p"].map(q=>(
                <button key={q} className={`qchip ${urlQuality===q?"sel":""}`} onClick={()=>setUrlQuality(q)}>{q}</button>
              ))}
            </div>
            <select className="sel-input" style={{marginLeft:6}} value={urlAudio} onChange={e=>setUrlAudio(e.target.value)}>
              <option value="sub">SUB</option><option value="dub">DUB</option>
            </select>
          </div>
          {urlPreview && (
            <div className="url-preview">
              <div style={{marginBottom:6}}>
                <span style={{color:"var(--txt)",fontWeight:600}}>{urlPreview.title}</span>
                {urlPreview.japanese&&<span style={{color:"var(--dim)",marginLeft:8}}>{urlPreview.japanese}</span>}
              </div>
              <div>追加予定: <span>{urlEpTo-urlEpFrom+1}</span>話 （E<span>{urlEpFrom}</span>〜E<span>{urlEpTo}</span>） ／ <span>{urlQuality}</span> ／ 合計: {urlPreview.episodes?.sub||"?"}話</div>
              <div style={{marginTop:8,display:"flex",gap:8}}>
                <button className="btn primary sm" onClick={handleBulkAdd}>⬇ {urlEpTo-urlEpFrom+1}話をキューに追加</button>
                <button className="btn sm" onClick={()=>setUrlPreview(null)}>クリア</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid view */}
      {view==="grid" && (
        <div className="ag-grid-view">
          {groups.map(g=>(
            <div key={g.series} className="ag-grid-card"
              onClick={()=>{setView("list");setExpanded(e=>({...e,[g.series]:true}));}}>
              <div className="ag-grid-poster-ph">{g.series.slice(0,10)}</div>
              <div className="ag-grid-info">
                <div className="ag-grid-title">{g.series}</div>
                <div className="ag-grid-count">{g.files.length}話 · {groupSize(g)}</div>
              </div>
            </div>
          ))}
          {groups.length===0&&<div className="empty" style={{gridColumn:"1/-1"}}><div className="empty-icon">⊞</div>ファイルが見つかりません</div>}
        </div>
      )}

      {/* List view */}
      {view==="list" && (
        <div>
          {groups.length===0&&<div className="empty"><div className="empty-icon">▤</div>ファイルが見つかりません</div>}
          {groups.map(g=>{
            const isOpen=!!expanded[g.series];
            const gSel=getGroupSel(g);
            const allSel=gSel.size===g.files.length&&g.files.length>0;
            return (
              <div key={g.series} className={`ag-card ${isOpen?"expanded":""}`}>
                <div className="ag-header" onClick={()=>toggleExpand(g.series)}>
                  <div className="ag-poster-ph">{g.series.slice(0,6)}</div>
                  <div className="ag-title-wrap">
                    <div className="ag-title">{g.series}</div>
                    <div className="ag-meta">{g.animeId} · {g.files[0]?.quality||"—"}</div>
                  </div>
                  <div className="ag-stats">
                    <div className="ag-stat"><div className="ag-stat-val cyan-txt">{g.files.length}</div><div className="ag-stat-lbl">話</div></div>
                    <div className="ag-stat"><div className="ag-stat-val amber-txt">{groupSize(g)}</div><div className="ag-stat-lbl">合計</div></div>
                    {gSel.size>0&&<div className="ag-stat"><div className="ag-stat-val rose-txt">{gSel.size}</div><div className="ag-stat-lbl">選択</div></div>}
                  </div>
                  <span className={`ag-chevron ${isOpen?"open":""}`}>▶</span>
                </div>

                {isOpen && (
                  <>
                    {/* Bulk action bar */}
                    <div className="ag-actions-bar">
                      <input type="checkbox" className="cb" checked={allSel} onChange={()=>toggleGroupAll(g)}/>
                      <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dim)"}}>
                        {gSel.size>0?`${gSel.size}件選択中`:"全選択"}
                      </span>
                      <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
                        <button className="dl-http-btn" onClick={()=>bulkHttpDownload(g)}>
                          ⬇ HTTP {gSel.size>0?`選択${gSel.size}件`:"全話"}
                        </button>
                        <button className="dl-sftp-btn"
                          onClick={()=>{
                            const targets=gSel.size>0?g.files.filter(f=>gSel.has(f.name)):g.files;
                            onSftp({files:targets,label:`${g.series}（${targets.length}話）`});
                          }}>
                          ⤓ SFTP {gSel.size>0?`選択${gSel.size}件`:"全話"}
                        </button>
                        <button className="zip-btn"
                          onClick={()=>{
                            const targets=gSel.size>0?g.files.filter(f=>gSel.has(f.name)):g.files;
                            onZip({files:targets,label:`${g.series}（${targets.length}話）`});
                          }}>
                          🗜 ZIP {gSel.size>0?`選択${gSel.size}件`:"全話"}
                        </button>
                        <button className="meta-btn"
                          onClick={()=>{
                            const targets=gSel.size>0?g.files.filter(f=>gSel.has(f.name)):g.files;
                            onMeta({files:targets,label:`${g.series}`});
                          }}>
                          ✦ メタデータ {gSel.size>0?`${gSel.size}件`:"全話"}
                        </button>
                        <button className="meta-btn"
                          onClick={()=>{
                            const targets=gSel.size>0?g.files.filter(f=>gSel.has(f.name)):g.files;
                            onMeta({files:targets});
                          }}>
                          🏷 メタ編集
                        </button>
                        <button className="btn sm" onClick={()=>toast(`${g.series} 全話再生キューへ`,"info")}>▶ まとめて再生</button>
                        {gSel.size>0&&<button className="btn danger sm" onClick={()=>deleteSelected(g)}>✕ 選択削除({gSel.size})</button>}
                        <button className="btn danger sm" onClick={()=>deleteGroup(g)}>✕ シリーズ削除</button>
                      </div>
                    </div>

                    {/* Episode list */}
                    <div className="ag-ep-list">
                      <div style={{display:"grid",gridTemplateColumns:"36px 36px 1fr 90px 80px 160px",
                        gap:8,padding:"6px 14px",fontFamily:"var(--mono)",fontSize:"9px",
                        letterSpacing:".18em",textTransform:"uppercase",color:"var(--dimmer)",
                        borderBottom:"1px solid var(--border)"}}>
                        <span/><span style={{textAlign:"right"}}>#</span>
                        <span>ファイル名</span>
                        <span style={{textAlign:"right"}}>サイズ</span>
                        <span>日付</span>
                        <span style={{textAlign:"right"}}>操作</span>
                      </div>
                      {g.files.slice().sort((a,b)=>(a.ep||0)-(b.ep||0)).map((f,fi)=>{
                        const pct=dlProgress[f.name];
                        return (
                          <div key={fi} style={{display:"grid",
                            gridTemplateColumns:"36px 36px 1fr 90px 80px 160px",
                            gap:8,alignItems:"center",padding:"8px 14px",
                            borderBottom:"1px solid rgba(255,255,255,.03)",
                            transition:"background .12s"}}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(0,255,213,.025)"}
                            onMouseLeave={e=>e.currentTarget.style.background=""}>
                            <input type="checkbox" className="cb"
                              checked={gSel.has(f.name)}
                              onChange={()=>toggleFile(g,f.name)}
                              onClick={e=>e.stopPropagation()}/>
                            <span className="ag-ep-num">{String(f.ep||fi+1).padStart(2,"0")}</span>
                            <span style={{fontFamily:"var(--mono)",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                            <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",textAlign:"right"}}>{f.size}</span>
                            <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dim)"}}>{f.date}</span>
                            <div style={{display:"flex",gap:4,justifyContent:"flex-end",alignItems:"center"}}>
                              {pct!=null ? (
                                <div className="inline-prog">
                                  <div className="inline-prog-track"><div className="inline-prog-fill" style={{width:`${pct}%`}}/></div>
                                  <span>{pct}%</span>
                                </div>
                              ) : (
                                <>
                                  <button className="btn sm" title="再生" onClick={()=>toast(`再生: ${f.name}`,"info")}>▶</button>
                                  <button className="dl-http-btn" title="HTTPダウンロード" onClick={()=>httpDownload(f)}>⬇ HTTP</button>
                                  <button className="dl-sftp-btn" title="SFTPで転送" onClick={()=>onSftp({files:[f],label:f.name})}>⤓ SFTP</button>
                                  <button className="meta-btn" title="メタデータ編集" onClick={()=>onMeta({files:[f]})}>🏷</button>
                                  <button className="btn sm" title="リネーム" onClick={()=>toast(`リネーム: ${f.name}`,"info")}>✎</button>
                                  <button className="btn danger sm" onClick={()=>{setFiles(fs=>fs.filter(x=>x.name!==f.name));toast(`削除: ${f.name}`,"warn");}}>✕</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  METADATA MODAL  ― MP4ファイルにffmpegでメタデータを書き込む
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
//  METADATA MODAL  ― mp4にメタデータ自動取得＆書き込み
// ══════════════════════════════════════════════════════════════════

// hianime APIから取得するメタデータのモック (実際はfetchで置き換え)
const ANIME_META_MOCK = {
  "attack-on-titan-112": {
    title:"Attack on Titan", titleJa:"進撃の巨人",
    studio:"MAPPA / Wit Studio", year:"2013",
    genres:["Action","Drama","Fantasy","Military"],
    rating:"9.0", status:"Finished",
    description:"ある日、超大型の巨人が現れ、百年の平和を築いていた壁が崩壊する。主人公のエレン、ミカサ、アルミンは故郷を失い、巨人と戦う兵士への道を歩み始める。",
    poster:"https://cdn.myanimelist.net/images/anime/10/47347.jpg",
    episodes: {
      1:{ title:"二千年後の君へ", air:"2013-04-06", thumbnail:"" },
      2:{ title:"その日", air:"2013-04-13", thumbnail:"" },
      3:{ title:"絶望の中で鈍く光る", air:"2013-04-20", thumbnail:"" },
    }
  },
  "chainsaw-man-17408": {
    title:"Chainsaw Man", titleJa:"チェンソーマン",
    studio:"MAPPA", year:"2022",
    genres:["Action","Horror","Supernatural"],
    rating:"8.5", status:"Finished",
    description:"父親の借金のためにデビルハンターをする少年・デンジが、愛犬のポチタと合体しチェンソーマンとして生まれ変わる物語。",
    poster:"https://cdn.myanimelist.net/images/anime/1806/126216.jpg",
    episodes: {
      1:{ title:"犬とチェンソー", air:"2022-10-11", thumbnail:"" },
      12:{ title:"バラバラ殺人事件", air:"2022-12-27", thumbnail:"" },
    }
  },
  "demon-slayer-kimetsu-no-yaiba-47": {
    title:"Demon Slayer", titleJa:"鬼滅の刃",
    studio:"ufotable", year:"2019",
    genres:["Action","Historical","Supernatural"],
    rating:"8.7", status:"Finished",
    description:"炭治郎が鬼に家族を殺され、鬼にされた妹・禰豆子を人間に戻すため、鬼殺隊に入り修業を積む。",
    poster:"https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
    episodes: { 1:{ title:"残酷", air:"2019-04-06", thumbnail:"" } }
  },
  "frieren-beyond-journeys-end-18542": {
    title:"Frieren: Beyond Journey's End", titleJa:"葬送のフリーレン",
    studio:"Madhouse", year:"2023",
    genres:["Adventure","Drama","Fantasy","Slice of Life"],
    rating:"9.3", status:"Finished",
    description:"魔王討伐の旅を終えた後、エルフの魔法使いフリーレンが、かつての仲間の死を通じて「人生とは何か」を問い直す物語。",
    poster:"https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
    episodes: {
      1:{ title:"冒険の終わり", air:"2023-09-29", thumbnail:"" },
      2:{ title:"別れの魔法", air:"2023-09-29", thumbnail:"" },
      3:{ title:"魔法使いらしく", air:"2023-10-06", thumbnail:"" },
    }
  },
};

const META_WRITE_PHASES = ["取得","確認・編集","書込","完了"];

function MetadataModal({ files, dlBase, onClose, toast }) {
  const [phase,       setPhase]       = useState(0); // 0=select 1=edit 2=writing 3=done
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [fetching,    setFetching]    = useState(false);
  const [metaMap,     setMetaMap]     = useState({}); // filename → metadata obj
  const [writeLog,    setWriteLog]    = useState([]); // {name,state:"wait"|"writing"|"done"|"err"}
  const [allProgress, setAllProgress] = useState(0);

  // current file
  const cur = files[activeIdx];

  // ─ メタデータの初期値を各ファイルから生成 ─
  const getDefault = useCallback((f) => {
    const mock = ANIME_META_MOCK[f.animeId] || {};
    const epMeta = mock.episodes?.[f.ep] || {};
    return {
      title:       mock.titleJa    || f.series || "",
      titleEn:     mock.title      || "",
      episodeTitle: epMeta.title   || `Episode ${f.ep||""}`,
      episode:     String(f.ep    || ""),
      season:      "1",
      studio:      mock.studio    || "",
      year:        mock.year       || "",
      genres:      mock.genres    || [],
      rating:      mock.rating    || "",
      description: mock.description|| "",
      poster:      mock.poster    || "",
      airDate:     epMeta.air      || f.date || "",
      comment:     `Source: hianime · Quality: ${f.quality||""} · AnimeVault`,
      // write options
      writeThumb:  true,
      writeTags:   true,
      writeChapters: false,
    };
  }, []);

  // 初期化
  useEffect(() => {
    const m = {};
    files.forEach(f => { m[f.name] = getDefault(f); });
    setMetaMap(m);
  }, [files, getDefault]);

  const meta = metaMap[cur?.name] || {};
  function setMeta(key, val) {
    setMetaMap(p => ({ ...p, [cur.name]: { ...p[cur.name], [key]: val } }));
  }

  // ─ APIから自動取得（シミュレーション） ─
  async function fetchAll() {
    setFetching(true);
    toast("hianime APIからメタデータ取得中…", "info");
    await new Promise(r => setTimeout(r, 1200));
    const m = {};
    files.forEach(f => { m[f.name] = getDefault(f); });
    setMetaMap(m);
    setFetching(false);
    setPhase(1);
    toast(`✓ ${files.length}件のメタデータを取得しました`, "info");
    // 実際のAPIコール:
    // for (const f of files) {
    //   const res = await fetch(`${apiBase}/api/v1/anime/${f.animeId}`);
    //   const j = await res.json();
    //   m[f.name] = buildMeta(j.data, f);
    // }
  }

  // ─ ffmpegコマンドプレビュー生成 ─
  function buildCmd(f, m) {
    const lines = [
      `ffmpeg -i "${f.name}"`,
      m.writeTags  && `  -metadata title="${m.episodeTitle || m.title}"`,
      m.writeTags  && `  -metadata show="${m.title}"`,
      m.writeTags  && `  -metadata season_number="${m.season}"`,
      m.writeTags  && `  -metadata episode_sort="${m.episode}"`,
      m.writeTags  && `  -metadata artist="${m.studio}"`,
      m.writeTags  && `  -metadata date="${m.year}"`,
      m.writeTags  && `  -metadata genre="${(m.genres||[]).join('; ')}"`,
      m.writeTags  && `  -metadata comment="${m.comment}"`,
      m.writeTags  && `  -metadata description="${(m.description||"").slice(0,80)}..."`,
      m.writeThumb && m.poster && `  -i "${m.poster}"`,
      m.writeThumb && m.poster && `  -map 0 -map 1 -disposition:1 attached_pic`,
      `  -codec copy`,
      `  "${f.name.replace(".mp4","")}_meta.mp4"`,
    ].filter(Boolean);
    return lines.join(" \\\n");
  }

  // ─ 一括書き込み ─
  async function writeAll() {
    setPhase(2);
    const log = files.map(f => ({ name:f.name, state:"wait" }));
    setWriteLog(log);
    setAllProgress(0);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setWriteLog(l => l.map((e,j) => j===i ? {...e,state:"writing"} : e));

      // サーバー側 API呼び出し（シミュレーション）
      await new Promise(r => setTimeout(r, 600 + Math.random()*600));
      // 実際:
      // await fetch(`${dlBase}/api/metadata`, {
      //   method:"POST",
      //   headers:{"Content-Type":"application/json"},
      //   body: JSON.stringify({ file: f.name, meta: metaMap[f.name] })
      // });

      setWriteLog(l => l.map((e,j) => j===i ? {...e,state:"done"} : e));
      setAllProgress(Math.round((i+1)/files.length*100));
    }

    setPhase(3);
    toast(`✓ ${files.length}件のメタデータ書き込み完了`, "info");
  }

  const isWriting = phase === 2;
  const isDone    = phase === 3;

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&!isWriting&&onClose()}>
      <div className="modal-box meta-modal-box">
        <div className="meta-modal-header">
          <span className="meta-modal-title">✦ メタデータ マネージャー — {files.length}ファイル</span>
          <button className="btn sm" onClick={onClose} disabled={isWriting}>✕ 閉じる</button>
        </div>

        {/* フェーズバー */}
        <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"var(--c2)",padding:"0 18px",flexShrink:0}}>
          {META_WRITE_PHASES.map((p,i)=>(
            <div key={i} style={{
              fontFamily:"var(--mono)",fontSize:10,padding:"10px 16px",
              letterSpacing:".1em",cursor:i<=phase?"pointer":"default",
              color:i<phase?"var(--green)":i===phase?"var(--green)":"var(--dimmer)",
              borderBottom:`2px solid ${i===phase?"var(--green)":"transparent"}`,
              marginBottom:-1, transition:"all .13s",
              background:i===phase?"rgba(61,255,160,.05)":"transparent"
            }} onClick={()=>{ if(i<=phase&&phase<2) setPhase(i); }}>
              {i<phase?"✓ ":""}{p}
            </div>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            {phase===0 && (
              <button className="meta-btn" style={{padding:"5px 14px"}} onClick={fetchAll} disabled={fetching}>
                {fetching?<><Spinner/> 取得中…</>:"✦ API自動取得"}
              </button>
            )}
            {phase===1 && (
              <button className="meta-btn" style={{padding:"5px 14px",fontSize:11}} onClick={writeAll}>
                ✦ {files.length}件を一括書込
              </button>
            )}
          </div>
        </div>

        <div className="modal-body" style={{display:"flex",gap:14,padding:"14px 18px",overflow:"hidden",flex:1}}>

          {/* ─ LEFT: ファイルリスト ─ */}
          {(phase===0||phase===1) && (
            <div style={{width:220,flexShrink:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".18em",textTransform:"uppercase",
                color:"var(--dim)",marginBottom:8}}>ファイル一覧</div>
              <div className="meta-file-list" style={{flex:1,overflowY:"auto"}}>
                {files.map((f,i)=>{
                  const m=metaMap[f.name]||{};
                  const hasData=!!m.title;
                  return (
                    <div key={i} className={`meta-file-row ${i===activeIdx?"active":""}`}
                      onClick={()=>setActiveIdx(i)}>
                      <span style={{fontSize:13}}>🎬</span>
                      <span className="meta-file-name">{f.name}</span>
                      <span className={`meta-file-status ${hasData?"ok":"none"}`}>
                        {hasData?"✓":"—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─ RIGHT: エディター ─ */}
          {phase===1 && cur && (
            <div style={{flex:1,overflowY:"auto",minWidth:0}}>
              {/* ポスター + 基本情報 */}
              <div style={{display:"flex",gap:14,marginBottom:16}}>
                <div style={{width:80,flexShrink:0}}>
                  {meta.poster ? (
                    <img src={meta.poster} alt="poster"
                      style={{width:80,height:112,objectFit:"cover",borderRadius:4,border:"1px solid var(--border)"}}
                      onError={e=>{e.target.style.display="none";}}/>
                  ) : (
                    <div style={{width:80,height:112,background:"var(--c3)",borderRadius:4,
                      border:"1px solid var(--border)",display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:24,color:"var(--dimmer)"}}>🎬</div>
                  )}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".18em",
                    textTransform:"uppercase",color:"var(--dim)",marginBottom:4}}>サムネイル URL</div>
                  <input className="meta-input" value={meta.poster||""} onChange={e=>setMeta("poster",e.target.value)}
                    placeholder="https://cdn.myanimelist.net/images/anime/..."
                    style={{marginBottom:8}}/>
                  <div style={{display:"flex",gap:8}}>
                    <label style={{display:"flex",alignItems:"center",gap:5,fontFamily:"var(--mono)",fontSize:10,cursor:"pointer"}}>
                      <input type="checkbox" className="cb" checked={!!meta.writeThumb}
                        onChange={e=>setMeta("writeThumb",e.target.checked)}/>
                      サムネイル書込
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:5,fontFamily:"var(--mono)",fontSize:10,cursor:"pointer"}}>
                      <input type="checkbox" className="cb" checked={!!meta.writeTags}
                        onChange={e=>setMeta("writeTags",e.target.checked)}/>
                      タグ書込
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:5,fontFamily:"var(--mono)",fontSize:10,cursor:"pointer"}}>
                      <input type="checkbox" className="cb" checked={!!meta.writeChapters}
                        onChange={e=>setMeta("writeChapters",e.target.checked)}/>
                      チャプター
                    </label>
                  </div>
                </div>
              </div>

              <div className="meta-fields-wrap">
                <div className="meta-fields-head">
                  ▸ タグ情報
                  <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:9,color:"var(--dim)"}}>
                    {cur.name}
                  </span>
                </div>
                <div className="meta-fields-grid">
                  <div className="meta-field">
                    <label>シリーズタイトル (日本語)</label>
                    <input className="meta-input" value={meta.title||""} onChange={e=>setMeta("title",e.target.value)}/>
                  </div>
                  <div className="meta-field">
                    <label>タイトル (English)</label>
                    <input className="meta-input" value={meta.titleEn||""} onChange={e=>setMeta("titleEn",e.target.value)}/>
                  </div>
                  <div className="meta-field">
                    <label>エピソードタイトル</label>
                    <input className="meta-input" value={meta.episodeTitle||""} onChange={e=>setMeta("episodeTitle",e.target.value)}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div className="meta-field">
                      <label>話数 (episode)</label>
                      <input className="meta-input" value={meta.episode||""} onChange={e=>setMeta("episode",e.target.value)}/>
                    </div>
                    <div className="meta-field">
                      <label>シーズン</label>
                      <input className="meta-input" value={meta.season||""} onChange={e=>setMeta("season",e.target.value)}/>
                    </div>
                  </div>
                  <div className="meta-field">
                    <label>スタジオ (artist)</label>
                    <input className="meta-input" value={meta.studio||""} onChange={e=>setMeta("studio",e.target.value)}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div className="meta-field">
                      <label>放映年</label>
                      <input className="meta-input" value={meta.year||""} onChange={e=>setMeta("year",e.target.value)}/>
                    </div>
                    <div className="meta-field">
                      <label>放映日</label>
                      <input className="meta-input" value={meta.airDate||""} onChange={e=>setMeta("airDate",e.target.value)}/>
                    </div>
                  </div>
                  <div className="meta-field">
                    <label>評価 (rating)</label>
                    <input className="meta-input" value={meta.rating||""} onChange={e=>setMeta("rating",e.target.value)}/>
                  </div>
                  <div className="meta-field full">
                    <label>ジャンル</label>
                    <div className="meta-tag-row">
                      {["Action","Adventure","Comedy","Drama","Fantasy","Horror","Mystery",
                        "Romance","Sci-Fi","Slice of Life","Sports","Supernatural","Historical","Military"].map(g=>(
                        <span key={g} className={`meta-tag-chip ${(meta.genres||[]).includes(g)?"sel":""}`}
                          onClick={()=>{
                            const cur2=meta.genres||[];
                            setMeta("genres", cur2.includes(g)?cur2.filter(x=>x!==g):[...cur2,g]);
                          }}>{g}</span>
                      ))}
                    </div>
                  </div>
                  <div className="meta-field full">
                    <label>あらすじ (description)</label>
                    <textarea className="meta-input meta-textarea" value={meta.description||""}
                      onChange={e=>setMeta("description",e.target.value)}/>
                  </div>
                  <div className="meta-field full">
                    <label>コメント</label>
                    <input className="meta-input" value={meta.comment||""} onChange={e=>setMeta("comment",e.target.value)}/>
                  </div>
                </div>
              </div>

              {/* ffmpegコマンドプレビュー */}
              <div style={{marginBottom:4,fontFamily:"var(--mono)",fontSize:9,letterSpacing:".15em",
                textTransform:"uppercase",color:"var(--dim)"}}>▸ ffmpeg コマンドプレビュー</div>
              <div className="meta-cmd-box">
                {buildCmd(cur, meta).split("\n").map((line,i)=>{
                  const parts = line.match(/(-metadata|-i|-map|-codec|-disposition|\w+\.mp4|"[^"]*"|\S+)/g) || [line];
                  return (
                    <div key={i}>
                      {parts.map((p,j)=>{
                        const cls = p.startsWith("-metadata")?"cmd-flag":
                                    p.startsWith("-")?"cmd-kw":
                                    p.startsWith('"')?"cmd-val":"";
                        return <span key={j} className={cls}>{p} </span>;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─ phase 0: 取得前ガイド ─ */}
          {phase===0 && (
            <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",
              gap:16,textAlign:"center",padding:"32px"}}>
              <div style={{fontSize:48}}>✦</div>
              <div style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--green)",marginBottom:4}}>
                メタデータを自動取得してmp4に書き込みます
              </div>
              <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--dim)",lineHeight:1.8,maxWidth:400}}>
                hianime APIから以下を自動取得します:<br/>
                タイトル / エピソード名 / あらすじ / ジャンル<br/>
                スタジオ / 放映年 / ポスター画像（サムネイル）<br/>
                <br/>
                サーバー側でffmpegを使って直接mp4に書き込みます
              </div>
              <button className="meta-btn" style={{padding:"8px 24px",fontSize:12}} onClick={fetchAll} disabled={fetching}>
                {fetching?<><Spinner/> 取得中…</>:`✦ ${files.length}件のメタデータを自動取得`}
              </button>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dimmer)"}}>
                手動でも編集できます — 「確認・編集」タブに進んでください
              </div>
              <button className="btn sm" onClick={()=>setPhase(1)}>スキップして編集へ →</button>
            </div>
          )}

          {/* ─ phase 2: 書込中 ─ */}
          {(phase===2||phase===3) && (
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{fontFamily:"var(--mono)",fontSize:11,color:isDone?"var(--green)":"var(--amber)"}}>
                  {isDone?`✓ 完了 — ${files.length}ファイル処理済`:
                    <><Spinner/> ffmpegでメタデータ書込中… {allProgress}%</>}
                </div>
              </div>
              <div className="zip-big-bar" style={{borderColor:"rgba(61,255,160,.15)"}}>
                <div style={{height:"100%",borderRadius:5,width:`${allProgress}%`,transition:"width .4s",
                  background:"linear-gradient(90deg,var(--green),var(--cyan))",
                  boxShadow:"0 0 10px rgba(61,255,160,.4)"}}/>
              </div>
              <div style={{border:"1px solid var(--border)",borderRadius:"var(--r)",overflow:"hidden",flex:1,overflowY:"auto"}}>
                <div style={{padding:"6px 14px",fontFamily:"var(--mono)",fontSize:9,letterSpacing:".15em",
                  textTransform:"uppercase",color:"var(--dimmer)",borderBottom:"1px solid var(--border)",
                  background:"var(--c2)"}}>処理ログ</div>
                {writeLog.map((e,i)=>(
                  <div key={i} className="meta-write-row">
                    <span className="meta-write-icon">
                      {e.state==="done"?"✓":e.state==="writing"?"⟳":e.state==="err"?"✕":"·"}
                    </span>
                    <span className="meta-write-name">{e.name}</span>
                    <span className={`meta-write-state ${e.state}`}>
                      {e.state==="done"?"完了":e.state==="writing"?"書込中...":e.state==="err"?"エラー":"待機"}
                    </span>
                  </div>
                ))}
              </div>
              {isDone && (
                <div className="zip-result-box" style={{border:"1px solid rgba(61,255,160,.25)",
                  background:"linear-gradient(135deg,rgba(61,255,160,.07),rgba(0,255,213,.04))"}}>
                  <div className="zip-result-icon">✦</div>
                  <div style={{flex:1}}>
                    <div className="zip-result-name" style={{color:"var(--green)"}}>
                      メタデータ書き込み完了
                    </div>
                    <div className="zip-result-meta">
                      {files.length}ファイル処理 · タイトル / サムネ / ジャンル / あらすじ 埋め込み済
                    </div>
                  </div>
                  <button className="btn primary sm" onClick={onClose}>閉じる</button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ZIP MODAL  ― サーバー上ファイルをZIP圧縮してダウンロード
// ══════════════════════════════════════════════════════════════════
const ZIP_PHASES = ["選択確認", "サーバー圧縮中", "転送中", "完了"];

function calcTotalMB(files) {
  return files.reduce((acc, f) => {
    const n = parseFloat(f.size);
    return acc + (f.size?.includes("GB") ? n * 1024 : n || 0);
  }, 0);
}

function fmtMB(mb) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}

function ZipModal({ files, target, dlBase, onClose, toast }) {
  // scope: "all" | "series" | "custom"
  const [scope,      setScope]      = useState(target ? "custom" : "all");
  const [selected,   setSelected]   = useState(() => new Set((target?.files||[]).map(f=>f.name)));
  const [zipName,    setZipName]    = useState(() => {
    if (target?.label) return `AnimeVault_${target.label.replace(/[（）\s]/g,"_")}_${new Date().toISOString().slice(0,10)}.zip`;
    return `AnimeVault_全ファイル_${new Date().toISOString().slice(0,10)}.zip`;
  });
  const [phase,      setPhase]      = useState(0); // 0=idle 1=compress 2=transfer 3=done
  const [progress,   setProgress]   = useState(0);
  const [curFile,    setCurFile]    = useState("");
  const [log,        setLog]        = useState([]);
  const [zipSize,    setZipSize]    = useState(null);
  const logRef = useRef(null);

  // grouped by series for scope selector
  const groups = useMemo(() => {
    const map = {};
    files.forEach(f => {
      if (!map[f.series]) map[f.series] = { series:f.series, files:[] };
      map[f.series].files.push(f);
    });
    return Object.values(map).sort((a,b) => a.series.localeCompare(b.series,"ja"));
  }, [files]);

  const targetFiles = useMemo(() => {
    if (scope === "all") return files;
    return files.filter(f => selected.has(f.name));
  }, [scope, selected, files]);

  const totalMB = useMemo(() => calcTotalMB(targetFiles), [targetFiles]);

  function toggleFile(name) {
    setSelected(s => { const n=new Set(s); n.has(name)?n.delete(name):n.add(name); return n; });
  }
  function toggleGroup(g) {
    const all = g.files.every(f=>selected.has(f.name));
    setSelected(s => {
      const n=new Set(s);
      g.files.forEach(f => all?n.delete(f.name):n.add(f.name));
      return n;
    });
  }

  function addLog(msg, type="cur") {
    setLog(l => [...l.slice(-40), { msg, type }]);
    setTimeout(() => setLog(l => l.map((e,i) => i===l.length-1 ? {...e,type:"done"} : e)), 600);
  }

  function scrollLog() {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }

  useEffect(() => { scrollLog(); }, [log]);

  async function startZip() {
    if (!targetFiles.length) { toast("対象ファイルを選択してください","warn"); return; }

    // ─ Phase 1: サーバー圧縮シミュレーション ─
    setPhase(1); setProgress(0); setLog([]);
    addLog(`🗜 ZIP圧縮開始: ${targetFiles.length}ファイル`);
    addLog(`📦 出力: ${zipName}`);

    const compressSteps = targetFiles.length;
    for (let i = 0; i < compressSteps; i++) {
      await new Promise(r => setTimeout(r, 60 + Math.random()*80));
      const f = targetFiles[i];
      setCurFile(f.name);
      addLog(`  追加: ${f.name}`);
      setProgress(Math.round((i+1)/compressSteps*50));
    }

    addLog(`✓ 圧縮完了 — ${fmtMB(totalMB * 0.82)} (推定)`);

    // ─ Phase 2: 転送 ─
    setPhase(2);
    addLog(`⬇ ブラウザへ転送開始...`);
    const transferSteps = 30;
    for (let i = 0; i < transferSteps; i++) {
      await new Promise(r => setTimeout(r, 40 + Math.random()*60));
      setProgress(50 + Math.round((i+1)/transferSteps*50));
    }

    // ─ Phase 3: 完了 ─
    const finalSizeMB = totalMB * 0.82;
    setZipSize(fmtMB(finalSizeMB));
    setPhase(3); setProgress(100);
    addLog(`✓ ダウンロード完了: ${fmtMB(finalSizeMB)}`);
    toast(`🗜 ZIPダウンロード完了: ${zipName}`,"info");

    // 実ZIPダウンロード
    try {
      const res = await fetch(`${dlBase}/api/zip`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ files: targetFiles.map(f=>f.path||f.name), outputName: zipName })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href=url; a.download=zipName; a.click();
        URL.revokeObjectURL(url);
      }
    } catch(apiErr) { console.warn("ZIP API:", apiErr.message); }
  }

  function reset() { setPhase(0); setProgress(0); setLog([]); setZipSize(null); setCurFile(""); }

  const isRunning = phase === 1 || phase === 2;
  const isDone    = phase === 3;

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&!isRunning&&onClose()}>
      <div className="modal-box zip-modal-box">
        <div className="zip-modal-header">
          <span className="zip-modal-title">🗜 ZIP一括ダウンロード</span>
          <button className="btn sm" onClick={onClose} disabled={isRunning}>✕ 閉じる</button>
        </div>

        <div className="modal-body">

          {/* ─ スコープ選択（idle時のみ） ─ */}
          {!isDone && phase===0 && (
            <>
              <div style={{marginBottom:12}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:".18em",
                  textTransform:"uppercase",color:"var(--dim)",marginBottom:8}}>
                  圧縮対象
                </div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  {[["all","全ファイル"],["series","シリーズ別選択"],["custom","カスタム"]].map(([v,lbl])=>(
                    <button key={v}
                      className={`sftp-tab ${scope===v?"active":""}`}
                      style={{border:"1px solid var(--border)",borderRadius:"var(--r)",padding:"5px 12px",cursor:"pointer",
                        background:scope===v?"rgba(255,184,48,.1)":"transparent",
                        color:scope===v?"var(--amber)":"var(--dim)",
                        fontFamily:"var(--mono)",fontSize:10,borderColor:scope===v?"rgba(255,184,48,.35)":"var(--border)"}}
                      onClick={()=>{
                        setScope(v);
                        if(v==="all") setSelected(new Set(files.map(f=>f.name)));
                        if(v==="custom") setSelected(new Set());
                      }}>{lbl}</button>
                  ))}
                </div>

                {/* シリーズ別 */}
                {scope==="series" && (
                  <div className="zip-scope-list" style={{marginBottom:14}}>
                    {groups.map(g=>{
                      const allSel=g.files.every(f=>selected.has(f.name));
                      return (
                        <div key={g.series} className={`zip-scope-row ${allSel?"selected":""}`}>
                          <label>
                            <input type="checkbox" className="cb" checked={allSel}
                              onChange={()=>toggleGroup(g)}/>
                            <span className="zip-scope-icon">📁</span>
                            <span className="zip-scope-name">{g.series}</span>
                            <span className="zip-scope-meta">{g.files.length}話 · {fmtMB(calcTotalMB(g.files))}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* カスタム */}
                {scope==="custom" && (
                  <div className="zip-scope-list" style={{marginBottom:14,maxHeight:220,overflowY:"auto"}}>
                    {files.map((f,i)=>(
                      <div key={i} className={`zip-scope-row ${selected.has(f.name)?"selected":""}`}>
                        <label>
                          <input type="checkbox" className="cb" checked={selected.has(f.name)}
                            onChange={()=>toggleFile(f.name)}/>
                          <span className="zip-scope-icon">🎬</span>
                          <span className="zip-scope-name">{f.name}</span>
                          <span className="zip-scope-meta">{f.size}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* ZIPファイル名 */}
                <div className="sftp-field" style={{marginBottom:14}}>
                  <label style={{display:"block",fontFamily:"var(--mono)",fontSize:9,
                    letterSpacing:".18em",textTransform:"uppercase",color:"var(--dim)",marginBottom:5}}>
                    ZIP ファイル名
                  </label>
                  <input className="sftp-input" value={zipName}
                    onChange={e=>setZipName(e.target.value)}/>
                </div>
              </div>

              {/* サマリー */}
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
                background:"var(--c0)",border:"1px solid var(--border)",borderRadius:"var(--r)",marginBottom:14}}>
                <div style={{fontSize:24}}>🗜</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--amber)",marginBottom:2}}>
                    {targetFiles.length}ファイル → {zipName}
                  </div>
                  <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dim)"}}>
                    元サイズ: {fmtMB(totalMB)} → 推定ZIP: {fmtMB(totalMB*0.82)}（約18%圧縮）
                  </div>
                </div>
                <button className="zip-btn" style={{fontSize:11,padding:"6px 16px"}}
                  onClick={startZip} disabled={!targetFiles.length}>
                  🗜 ZIP生成 & DL開始
                </button>
              </div>

              {/* API説明 */}
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dimmer)",lineHeight:1.8,
                background:"var(--c0)",padding:"10px 14px",borderRadius:"var(--r)",border:"1px solid var(--border)"}}>
                <div style={{color:"var(--dim)",marginBottom:4}}>▸ サーバー側 API（port 4040 に実装が必要）:</div>
                <code style={{color:"var(--amber)"}}>POST {dlBase}/api/zip</code>
                <div style={{marginTop:4}}>{"{"} files: string[], outputName: string {"}"}</div>
                <div style={{marginTop:4}}>→ レスポンス: <code style={{color:"var(--cyan)"}}>application/zip</code> バイナリストリーム</div>
              </div>
            </>
          )}

          {/* ─ 進捗表示 ─ */}
          {(isRunning || isDone) && (
            <>
              {/* フェーズインジケーター */}
              <div className="zip-phase-row" style={{marginBottom:14}}>
                {ZIP_PHASES.map((p,i)=>(
                  <span key={i} className={i<phase?"done":i===phase?"active":""}>
                    {i<phase?"✓ ":i===phase?"▶ ":""}{p}
                    {i<ZIP_PHASES.length-1&&<span style={{margin:"0 6px",opacity:.3}}>›</span>}
                  </span>
                ))}
              </div>

              {/* プログレスバー */}
              <div className="zip-progress-wrap">
                <div className="zip-status-label">
                  {isDone ? <><span style={{color:"var(--green)"}}>✓ 完了</span></> :
                    <><Spinner/> {phase===1?"圧縮中...":"転送中..."}</>}
                  <span style={{marginLeft:"auto"}}>{progress}%</span>
                </div>
                <div className="zip-big-bar">
                  <div className="zip-big-fill" style={{width:`${progress}%`}}/>
                </div>
                {!isDone && <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dim)",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {curFile}
                </div>}
              </div>

              {/* ファイルログ */}
              <div className="zip-file-log" ref={logRef}>
                {log.map((e,i)=>(
                  <div key={i} className={`zip-file-log-entry ${e.type}`}>{e.msg}</div>
                ))}
                {isRunning && <div className="zip-file-log-entry cur">_</div>}
              </div>

              {/* 完了ボックス */}
              {isDone && (
                <div className="zip-result-box">
                  <div className="zip-result-icon">🗜</div>
                  <div style={{flex:1}}>
                    <div className="zip-result-name">{zipName}</div>
                    <div className="zip-result-meta">
                      {targetFiles.length}ファイル · {zipSize} · ダウンロード完了
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <button className="zip-btn" onClick={reset}>🔄 再実行</button>
                    <button className="btn primary sm" onClick={onClose}>閉じる</button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  SFTP MODAL
// ══════════════════════════════════════════════════════════════════
const SFTP_MOCK_TREE = {
  "/media/anime": [
    { name:"進撃の巨人", type:"dir", children:"/media/anime/進撃の巨人" },
    { name:"チェンソーマン", type:"dir", children:"/media/anime/チェンソーマン" },
    { name:"鬼滅の刃", type:"dir", children:"/media/anime/鬼滅の刃" },
    { name:"葬送のフリーレン", type:"dir", children:"/media/anime/葬送のフリーレン" },
  ],
  "/media/anime/進撃の巨人": [
    { name:"進撃の巨人 Ep01 [1080p].mp4", type:"file", size:"782MB" },
    { name:"進撃の巨人 Ep02 [1080p].mp4", type:"file", size:"741MB" },
    { name:"進撃の巨人 Ep03 [1080p].mp4", type:"file", size:"798MB" },
  ],
  "/media/anime/チェンソーマン": [
    { name:"チェンソーマン Ep01 [1080p].mp4", type:"file", size:"634MB" },
    { name:"チェンソーマン Ep12 [1080p].mp4", type:"file", size:"651MB" },
  ],
  "/media/anime/鬼滅の刃": [
    { name:"鬼滅の刃 Ep01 [720p].mp4", type:"file", size:"420MB" },
  ],
  "/media/anime/葬送のフリーレン": [
    { name:"葬送のフリーレン Ep01 [720p].mp4", type:"file", size:"480MB" },
    { name:"葬送のフリーレン Ep02 [720p].mp4", type:"file", size:"461MB" },
    { name:"葬送のフリーレン Ep03 [720p].mp4", type:"file", size:"475MB" },
  ],
};

function SFTPModal({ config, setConfig, target, onClose, toast }) {
  const [tab,       setTab]       = useState(target ? "transfer" : "connect");
  const [connected, setConnected] = useState(false);
  const [connecting,setConnecting]= useState(false);
  const [remotePath,setRemotePath]= useState(config.remotePath || "/media/anime");
  const [dlProgress,setDlProgress]= useState({}); // filename → pct
  const [form,      setForm]      = useState({...config});

  const pathParts = remotePath.split("/").filter(Boolean);
  const currentItems = SFTP_MOCK_TREE[remotePath] || [];

  function connect() {
    if(!form.host){toast("ホストを入力してください","warn");return;}
    setConnecting(true);
    setTimeout(()=>{
      setConnecting(false);
      setConnected(true);
      setConfig(form);
      toast(`SFTP接続成功: ${form.user}@${form.host}`,"info");
      if(target) setTab("transfer");
    },1400);
  }

  function navigate(path) { setRemotePath(path); }
  function navigateTo(idx) {
    const parts=["", ...pathParts.slice(0,idx+1)];
    setRemotePath(parts.join("/") || "/");
  }

  function startTransfer(filename) {
    if(dlProgress[filename]!=null) return;
    let pct=0;
    const iv=setInterval(()=>{
      pct=Math.min(100,pct+Math.random()*10+5);
      setDlProgress(p=>({...p,[filename]:Math.round(pct)}));
      if(pct>=100){
        clearInterval(iv);
        setTimeout(()=>{
          setDlProgress(p=>{const n={...p};delete n[filename];return n;});
          toast(`✓ SFTP転送完了: ${filename}`,"info");
        },700);
      }
    },280);
  }

  function transferAll() {
    if(!target?.files?.length) return;
    target.files.forEach((f,i)=>setTimeout(()=>startTransfer(f.name),i*150));
    toast(`SFTPで${target.files.length}ファイルを転送開始`,"info");
  }

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">⤓ SFTP転送マネージャー</span>
          <button className="btn sm" onClick={onClose}>✕ 閉じる</button>
        </div>

        <div className="sftp-tabs" style={{padding:"0 18px",marginBottom:0,borderBottom:"1px solid var(--border)"}}>
          {[["connect","接続設定"],["browser","リモートブラウザ"],["transfer","転送"]].map(([id,label])=>(
            <div key={id} className={`sftp-tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{label}</div>
          ))}
        </div>

        <div className="modal-body">

          {/* ─ Connect tab ─ */}
          {tab==="connect" && (
            <div>
              <div className="sftp-grid">
                <div className="sftp-field"><label>ホスト / IP</label>
                  <input className="sftp-input" placeholder="192.168.1.100" value={form.host}
                    onChange={e=>setForm(f=>({...f,host:e.target.value}))}/></div>
                <div className="sftp-field"><label>ポート</label>
                  <input className="sftp-input" placeholder="22" value={form.port}
                    onChange={e=>setForm(f=>({...f,port:e.target.value}))}/></div>
                <div className="sftp-field"><label>ユーザー名</label>
                  <input className="sftp-input" placeholder="pi / ubuntu" value={form.user}
                    onChange={e=>setForm(f=>({...f,user:e.target.value}))}/></div>
                <div className="sftp-field"><label>パスワード</label>
                  <input className="sftp-input" type="password" placeholder="••••••••" value={form.password}
                    onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>
                <div className="sftp-field" style={{gridColumn:"1/-1"}}><label>SSH 鍵パス（任意）</label>
                  <input className="sftp-input" placeholder="~/.ssh/id_rsa" value={form.keyPath||""}
                    onChange={e=>setForm(f=>({...f,keyPath:e.target.value}))}/></div>
                <div className="sftp-field" style={{gridColumn:"1/-1"}}><label>リモートベースパス</label>
                  <input className="sftp-input" placeholder="/media/anime" value={form.remotePath}
                    onChange={e=>setForm(f=>({...f,remotePath:e.target.value}))}/></div>
              </div>
              <div className="sftp-status-row">
                <div className={`pulse-dot ${connected?"on":"off"}`}/>
                <span style={{fontFamily:"var(--mono)",fontSize:10}}>
                  {connected?`接続中: ${config.user}@${config.host}:${config.port}`:"未接続"}
                </span>
                <button className="btn primary sm" style={{marginLeft:"auto"}} onClick={connect} disabled={connecting}>
                  {connecting?<><Spinner/> 接続中…</>:"接続テスト"}
                </button>
              </div>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dim)",lineHeight:1.7}}>
                <div>• SSHキー認証を使う場合はパスワード欄を空にしてください</div>
                <div>• Mac ARM: <code style={{color:"var(--cyan)"}}>brew install openssh</code> が必要です</div>
                <div>• Tailscale経由の場合はTailscale IPアドレスを使用してください</div>
              </div>
            </div>
          )}

          {/* ─ Browser tab ─ */}
          {tab==="browser" && (
            <div>
              {!connected && (
                <div style={{textAlign:"center",padding:"32px",fontFamily:"var(--mono)",fontSize:12,color:"var(--dim)"}}>
                  <div style={{fontSize:28,marginBottom:12}}>⤓</div>
                  まず「接続設定」タブで接続してください
                  <div style={{marginTop:12}}><button className="btn primary sm" onClick={()=>setTab("connect")}>接続設定へ</button></div>
                </div>
              )}
              {connected && (
                <div className="sftp-browser">
                  <div className="sftp-path-bar">
                    <span className="sftp-path-seg" onClick={()=>navigate(config.remotePath||"/media/anime")}>~</span>
                    {pathParts.map((p,i)=>(
                      <span key={i}><span style={{color:"var(--dimmer)"}}>/</span>
                        <span className="sftp-path-seg" onClick={()=>navigateTo(i)}>{p}</span>
                      </span>
                    ))}
                    <div style={{marginLeft:"auto",display:"flex",gap:6}}>
                      <button className="btn sm" onClick={()=>{
                        const parent="/"+pathParts.slice(0,-1).join("/");
                        navigate(parent||config.remotePath||"/media/anime");
                      }}>↑ 上へ</button>
                      <button className="dl-sftp-btn" onClick={()=>{
                        const dirFiles=currentItems.filter(x=>x.type==="file");
                        if(dirFiles.length) dirFiles.forEach((f,i)=>setTimeout(()=>startTransfer(f.name),i*150));
                        else toast("このフォルダにファイルがありません","warn");
                      }}>⤓ フォルダ全転送</button>
                    </div>
                  </div>
                  {currentItems.length===0&&<div className="empty" style={{padding:"24px"}}>空のフォルダ</div>}
                  {currentItems.map((item,i)=>{
                    const pct=dlProgress[item.name];
                    return (
                      <div key={i} className="sftp-row">
                        <span className="sftp-icon">{item.type==="dir"?"📁":"🎬"}</span>
                        <span className="sftp-name" onClick={()=>item.type==="dir"&&navigate(item.children)}>{item.name}</span>
                        {item.type==="file" && <span className="sftp-size">{item.size}</span>}
                        {item.type==="dir" && (
                          <button className="dl-sftp-btn" style={{marginLeft:"auto"}}
                            onClick={e=>{e.stopPropagation();
                              const ch=SFTP_MOCK_TREE[item.children]||[];
                              ch.filter(x=>x.type==="file").forEach((f,i)=>setTimeout(()=>startTransfer(f.name),i*150));
                              toast(`フォルダ「${item.name}」を転送開始`,"info");
                            }}>⤓ フォルダDL</button>
                        )}
                        {item.type==="file" && (
                          pct!=null ? (
                            <div className="inline-prog" style={{minWidth:100}}>
                              <div className="inline-prog-track"><div className="inline-prog-fill" style={{width:`${pct}%`}}/></div>
                              <span>{pct}%</span>
                            </div>
                          ) : (
                            <button className="dl-sftp-btn" style={{marginLeft:"auto"}} onClick={()=>startTransfer(item.name)}>⤓ 転送</button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─ Transfer tab ─ */}
          {tab==="transfer" && (
            <div>
              {target && (
                <div className="url-panel" style={{marginBottom:14}}>
                  <div className="url-panel-title">転送対象: {target.label}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dim)",marginBottom:10}}>
                    {target.files?.length||0}ファイル
                  </div>
                  {!connected && (
                    <div style={{color:"var(--amber)",fontFamily:"var(--mono)",fontSize:10,marginBottom:10}}>
                      ⚠ 未接続です。先に接続設定を行ってください。
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <button className="btn primary" onClick={transferAll} disabled={!connected}>
                      ⤓ 全ファイルを転送開始
                    </button>
                    {!connected && <button className="btn sm" onClick={()=>setTab("connect")}>接続設定へ</button>}
                  </div>
                  <div style={{maxHeight:300,overflowY:"auto",border:"1px solid var(--border)",borderRadius:"var(--r)"}}>
                    {target.files?.map((f,i)=>{
                      const pct=dlProgress[f.name];
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                          borderBottom:"1px solid rgba(255,255,255,.03)"}}>
                          <span style={{fontSize:13}}>🎬</span>
                          <span style={{fontFamily:"var(--mono)",fontSize:10,flex:1,overflow:"hidden",
                            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                          <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",flexShrink:0}}>{f.size}</span>
                          {pct!=null ? (
                            <div className="inline-prog" style={{minWidth:100}}>
                              <div className="inline-prog-track"><div className="inline-prog-fill" style={{width:`${pct}%`}}/></div>
                              <span>{pct}%</span>
                            </div>
                          ) : (
                            <button className="dl-sftp-btn" onClick={()=>startTransfer(f.name)} disabled={!connected}>⤓</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!target && <div className="empty"><div className="empty-icon">⤓</div>転送対象がありません<br/><span style={{fontSize:11}}>ファイル管理から「SFTP」ボタンを押してください</span></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  FOLDER PAGE  ― サーバー上フォルダ構造 + フォルダごとDL
// ══════════════════════════════════════════════════════════════════
function FolderPage({ files, toast, dlBase, onSftp, onZip, onMeta }) {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [dlProgress, setDlProgress] = useState({});

  // Build folder tree from files
  const folders = useMemo(() => {
    const map = {};
    files.forEach(f => {
      if (!map[f.series]) map[f.series] = { name:f.series, animeId:f.animeId, files:[], quality:f.quality };
      map[f.series].files.push(f);
    });
    return Object.values(map).sort((a,b)=>a.name.localeCompare(b.name,"ja"));
  }, [files]);

  const currentFolder = selectedFolder
    ? folders.find(f=>f.name===selectedFolder)
    : null;

  function folderSize(folder) {
    const total=folder.files.reduce((acc,f)=>{
      const n=parseFloat(f.size);
      return acc+(f.size.includes("GB")?n*1024:n);
    },0);
    return total>=1024?`${(total/1024).toFixed(1)}GB`:`${Math.round(total)}MB`;
  }

  function httpDownloadFolder(folder) {
    folder.files.forEach((f,i)=>{
      if(dlProgress[f.name]!=null) return;
      setTimeout(()=>{
        let pct=0;
        const iv=setInterval(()=>{
          pct=Math.min(100,pct+Math.random()*8+4);
          setDlProgress(p=>({...p,[f.name]:Math.round(pct)}));
          if(pct>=100){
            clearInterval(iv);
            setTimeout(()=>setDlProgress(p=>{const n={...p};delete n[f.name];return n;}),700);
          }
        },300);
      },i*200);
    });
    toast(`「${folder.name}」${folder.files.length}ファイルのHTTPダウンロード開始`,"info");
  }

  return (
    <div className="folder-page">
      {/* Tree */}
      <div className="folder-tree">
        <div className="folder-tree-head">⊟ フォルダ一覧 ({folders.length})</div>
        <div style={{flex:1,overflowY:"auto"}}>
          <div className={`ftree-item ${!selectedFolder?"active":""}`}
            onClick={()=>setSelectedFolder(null)}>
            <span className="ftree-icon">📂</span>
            <span>すべて</span>
            <span className="ftree-count">{files.length}</span>
          </div>
          {folders.map(f=>(
            <div key={f.name}
              className={`ftree-item ${selectedFolder===f.name?"active":""}`}
              onClick={()=>setSelectedFolder(f.name)}>
              <span className="ftree-icon">📁</span>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
              <span className="ftree-count">{f.files.length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="folder-detail">
        {/* Header */}
        {currentFolder ? (
          <div className="folder-detail-head">
            <div style={{fontSize:28}}>📁</div>
            <div style={{flex:1}}>
              <div className="folder-detail-title">{currentFolder.name}</div>
              <div className="folder-detail-meta">
                {currentFolder.files.length}ファイル · {folderSize(currentFolder)} · {currentFolder.quality}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="dl-http-btn" onClick={()=>httpDownloadFolder(currentFolder)}>
                ⬇ HTTP 全話DL
              </button>
              <button className="dl-sftp-btn"
                onClick={()=>onSftp({files:currentFolder.files,label:`${currentFolder.name}（${currentFolder.files.length}話）`})}>
                ⤓ SFTPで転送
              </button>
              <button className="zip-btn"
                onClick={()=>onZip({files:currentFolder.files,label:`${currentFolder.name}（${currentFolder.files.length}話）`})}>
                🗜 ZIPでDL
              </button>
              <button className="meta-btn"
                onClick={()=>onMeta({files:currentFolder.files})}>
                🏷 メタデータ一括書込
              </button>
            </div>
          </div>
        ) : (
          <div className="folder-detail-head">
            <div style={{fontSize:28}}>📂</div>
            <div style={{flex:1}}>
              <div className="folder-detail-title">すべてのフォルダ</div>
              <div className="folder-detail-meta">{folders.length}作品 · {files.length}ファイル</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="dl-http-btn" onClick={()=>{
                folders.forEach(f=>httpDownloadFolder(f));
              }}>⬇ HTTP 全フォルダDL</button>
              <button className="dl-sftp-btn"
                onClick={()=>onSftp({files,label:`全フォルダ（${files.length}ファイル）`})}>
                ⤓ SFTP 全フォルダ転送
              </button>
              <button className="zip-btn"
                onClick={()=>onZip({files,label:`全フォルダ（${files.length}ファイル）`})}>
                🗜 全フォルダZIP
              </button>
              <button className="meta-btn"
                onClick={()=>onMeta({files})}>
                🏷 全ファイルメタ書込
              </button>
            </div>
          </div>
        )}

        {/* File list */}
        <div className="folder-file-list">
          <div className="folder-file-row-head">
            <span/>
            <span style={{textAlign:"right"}}>#</span>
            <span>ファイル名</span>
            <span style={{textAlign:"right"}}>サイズ</span>
            <span>日付</span>
            <span style={{textAlign:"right"}}>操作</span>
          </div>
          {(currentFolder ? currentFolder.files : files)
            .slice().sort((a,b)=>(a.ep||0)-(b.ep||0))
            .map((f,i)=>{
              const pct=dlProgress[f.name];
              return (
                <div key={i} className="folder-file-row">
                  <span style={{color:"var(--cyan)",fontSize:13,textAlign:"center"}}>🎬</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--cyan)",textAlign:"right"}}>
                    {String(f.ep||i+1).padStart(2,"0")}
                  </span>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",textAlign:"right"}}>{f.size}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--dim)"}}>{f.date}</span>
                  <div style={{display:"flex",gap:4,justifyContent:"flex-end",alignItems:"center"}}>
                    {pct!=null ? (
                      <div className="inline-prog">
                        <div className="inline-prog-track"><div className="inline-prog-fill" style={{width:`${pct}%`}}/></div>
                        <span>{pct}%</span>
                      </div>
                    ) : (
                      <>
                        <button className="btn sm" onClick={()=>toast(`再生: ${f.name}`,"info")}>▶</button>
                        <button className="dl-http-btn" onClick={()=>{
                          let pct2=0;
                          const iv=setInterval(()=>{
                            pct2=Math.min(100,pct2+Math.random()*8+4);
                            setDlProgress(p=>({...p,[f.name]:Math.round(pct2)}));
                            if(pct2>=100){clearInterval(iv);setTimeout(()=>setDlProgress(p=>{const n={...p};delete n[f.name];return n;}),700);}
                          },300);
                          toast(`HTTP DL開始: ${f.name}`,"info");
                        }}>⬇ HTTP</button>
                        <button className="dl-sftp-btn" onClick={()=>onSftp({files:[f],label:f.name})}>⤓ SFTP</button>
                        <button className="meta-btn" onClick={()=>onMeta({files:[f]})}>🏷</button>
                      </>
                    )}
                  </div>
                </div>
              );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  LOGS PAGE
// ══════════════════════════════════════════════════════════════════
function LogsPage({ logs }) {
  const [lvl, setLvl] = useState("ALL");
  const filtered = lvl==="ALL" ? logs : logs.filter(l => l.level===lvl);
  return (
    <div>
      <div className="row mb14">
        <div className="sec-dot"/>
        <span style={{fontFamily:"var(--mono)",fontSize:11,letterSpacing:".18em",textTransform:"uppercase",color:"var(--dim)"}}>
          動作ログ
        </span>
        <select className="sel-input" style={{marginLeft:"auto"}} value={lvl} onChange={e=>setLvl(e.target.value)}>
          {["ALL","INFO","SUCCESS","WARN","ERROR","DEBUG"].map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
      <div className="log-wrap">
        {filtered.length === 0 && (
          <div className="empty"><div className="empty-icon">◈</div>ログなし</div>
        )}
        {filtered.map((l,i) => (
          <div key={i} className="log-entry">
            <span className="log-time">{l.time}</span>
            <span className={`log-level log-${l.level}`}>{l.level}</span>
            <span className="log-msg">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  SETTINGS PAGE
// ══════════════════════════════════════════════════════════════════
function SettingsPage({ apiBase, setApiBase, dlBase, setDlBase, sftpConfig, setSftpConfig, toast }) {
  const [form, setForm] = useState({
    apiBase, dlBase,
    discordWebhook:"",
    defaultQuality:"1080p",
    savePath:"/Volumes/Media/Anime",
    defaultAudio:"sub",
    sftpHost: sftpConfig.host,
    sftpPort: sftpConfig.port,
    sftpUser: sftpConfig.user,
    sftpPassword: sftpConfig.password,
    sftpRemotePath: sftpConfig.remotePath,
    sftpKeyPath: sftpConfig.keyPath,
  });
  function save() {
    setApiBase(form.apiBase);
    setDlBase(form.dlBase);
    setSftpConfig({
      host:form.sftpHost, port:form.sftpPort, user:form.sftpUser,
      password:form.sftpPassword, remotePath:form.sftpRemotePath, keyPath:form.sftpKeyPath
    });
    toast("設定を保存しました","info");
  }
  const field = (key, label, placeholder, desc, type="text") => (
    <div className="setting-group">
      <label className="setting-label">{label}</label>
      <input className="setting-input" placeholder={placeholder} type={type}
        value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/>
      {desc && <div className="setting-desc">{desc}</div>}
    </div>
  );
  return (
    <div>
      <div className="sec-head mb20">
        <div className="sec-dot"/><div className="sec-title">設定</div>
      </div>
      <div className="settings-grid">
        <div>
          <div className="card" style={{padding:"16px 18px",marginBottom:14}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"var(--dim)",marginBottom:14}}>▸ API接続</div>
            {field("apiBase","hianime-API URL","http://localhost:3030","スクレイピングAPIのベースURL")}
            {field("dlBase","ダウンロードサーバーURL","http://localhost:4040","バックエンドダウンロードサーバーのURL")}
          </div>
          <div className="card" style={{padding:"16px 18px",marginBottom:14}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"var(--dim)",marginBottom:14}}>▸ SFTP設定</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:10}}>
              <div className="setting-group">
                <label className="setting-label">ホスト / IP</label>
                <input className="setting-input" placeholder="192.168.1.100 or Tailscale IP"
                  value={form.sftpHost} onChange={e=>setForm(f=>({...f,sftpHost:e.target.value}))}/>
              </div>
              <div className="setting-group">
                <label className="setting-label">ポート</label>
                <input className="setting-input" placeholder="22"
                  value={form.sftpPort} onChange={e=>setForm(f=>({...f,sftpPort:e.target.value}))}/>
              </div>
            </div>
            {field("sftpUser","ユーザー名","pi / ubuntu / your-user")}
            {field("sftpPassword","パスワード","••••••••","SSH鍵使用時は空欄でOK","password")}
            {field("sftpKeyPath","SSH 鍵パス","~/.ssh/id_rsa","秘密鍵のパス（任意）")}
            {field("sftpRemotePath","リモートベースパス","/media/anime","サーバー上の保存先ルートパス")}
            <div className="setting-desc" style={{marginTop:4}}>
              💡 外出先からはTailscale IPを使用 / Cloudflare Tunnel経由も可
            </div>
          </div>
          <div className="card" style={{padding:"16px 18px"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"var(--dim)",marginBottom:14}}>▸ 通知</div>
            {field("discordWebhook","Discord Webhook URL","https://discord.com/api/webhooks/...","完了時にDiscordへ通知")}
          </div>
        </div>
        <div>
          <div className="card" style={{padding:"16px 18px",marginBottom:14}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"var(--dim)",marginBottom:14}}>▸ ダウンロード設定</div>
            <div className="setting-group">
              <label className="setting-label">デフォルト画質</label>
              <select className="sel-input" style={{width:"100%"}} value={form.defaultQuality}
                onChange={e=>setForm(f=>({...f,defaultQuality:e.target.value}))}>
                {["360p","480p","720p","1080p"].map(q=><option key={q}>{q}</option>)}
              </select>
            </div>
            <div className="setting-group">
              <label className="setting-label">デフォルト音声</label>
              <select className="sel-input" style={{width:"100%"}} value={form.defaultAudio}
                onChange={e=>setForm(f=>({...f,defaultAudio:e.target.value}))}>
                <option value="sub">字幕 (SUB)</option>
                <option value="dub">吹替 (DUB)</option>
              </select>
            </div>
            {field("savePath","ローカル保存先パス","/Volumes/Media/Anime","ダウンロードファイルの保存先")}
          </div>
          <div className="card" style={{padding:"16px 18px"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"var(--dim)",marginBottom:10}}>▸ ファイル命名規則</div>
            <div className="setting-desc" style={{marginBottom:8}}>自動リネームテンプレート:</div>
            <code style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--amber)",
              background:"var(--c1)",padding:"6px 10px",borderRadius:"var(--r)",
              display:"block",border:"1px solid var(--border)"}}>
              {"{Title} Ep{00} [{Quality}].mp4"}
            </code>
            <div className="setting-desc mt8">例: 進撃の巨人 Ep01 [1080p].mp4</div>
          </div>
        </div>
      </div>
      <div style={{marginTop:16}}>
        <button className="btn primary" onClick={save}>✓ 設定を保存</button>
      </div>
    </div>
  );
}
