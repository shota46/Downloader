#!/bin/bash
# Downloader - 全サービス一括起動
BASE="$(cd "$(dirname "$0")" && pwd)"

echo "Starting consumet-api (:3000)..."
(cd "$BASE/consumet-api" && npm run start) &

echo "Starting anime-vault server (:4040)..."
(cd "$BASE/anime-vault/server" && ANIME_DIR="$BASE/downloads/anime" node index.js) &

echo "Starting server.py (FastAPI :8765)..."
(cd "$BASE" && python3 server.py) &

echo "Starting app.py (Flask :8080)..."
(cd "$BASE" && python3 app.py) &

# Dev mode: start Vite dev server
if [ "$1" = "dev" ]; then
  echo "Starting Vite dev server (:5173)..."
  (cd "$BASE/frontend" && npm run dev) &
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   All services started                       ║"
echo "║   Flask Gateway:  http://localhost:8080       ║"
echo "║   YTDL Server:    http://localhost:8765       ║"
echo "║   AnimeVault:     http://localhost:4040       ║"
echo "║   Consumet-API:   http://localhost:3030       ║"
if [ "$1" = "dev" ]; then
echo "║   Vite Dev:       http://localhost:5173       ║"
fi
echo "║                                              ║"
echo "║   LAN:  http://$(ipconfig getifaddr en0 2>/dev/null || echo 'N/A'):8080  ║"
echo "╚══════════════════════════════════════════════╝"

wait
