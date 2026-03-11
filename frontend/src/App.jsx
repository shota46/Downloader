import { useState } from "react";
import YTDownloadPanel from "./youtube/YTDownloadPanel";
import AnimeVault from "./animevault/AnimeVault";

const SWITCHER_STYLE = `
.module-switcher {
  display: flex; height: 32px; background: #08080f;
  border-bottom: 1px solid rgba(255,255,255,.08);
  align-items: stretch; flex-shrink: 0; z-index: 10000;
  font-family: 'JetBrains Mono', monospace; user-select: none;
}
.module-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 0 18px; font-size: 10px; letter-spacing: .14em;
  text-transform: uppercase; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all .15s; color: rgba(221,225,245,.4);
  background: transparent; border-top: none; border-left: none; border-right: none;
}
.module-tab:hover { color: rgba(221,225,245,.7); }
.module-tab.active-yt {
  color: #ff0033; border-bottom-color: #ff0033;
  background: rgba(255,0,51,.04);
}
.module-tab.active-av {
  color: #00ffd5; border-bottom-color: #00ffd5;
  background: rgba(0,255,213,.04);
}
.module-tab .tab-dot {
  width: 6px; height: 6px; border-radius: 50%;
}
.module-tab .tab-dot.yt { background: #ff0033; }
.module-tab .tab-dot.av { background: #00ffd5; }
`;

export default function App() {
  const [module, setModule] = useState("animevault");

  return (
    <>
      <style>{SWITCHER_STYLE}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <div className="module-switcher">
          <button
            className={`module-tab ${module === "youtube" ? "active-yt" : ""}`}
            onClick={() => setModule("youtube")}
          >
            <span className="tab-dot yt" />
            YouTube DL
          </button>
          <button
            className={`module-tab ${module === "animevault" ? "active-av" : ""}`}
            onClick={() => setModule("animevault")}
          >
            <span className="tab-dot av" />
            AnimeVault
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          {module === "youtube" ? <YTDownloadPanel /> : <AnimeVault />}
        </div>
      </div>
    </>
  );
}
