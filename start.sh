#!/bin/bash
# Downloader - 全サービス一括起動
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting hianime-API (:3030)..."
cd "$DIR/hianime-API" && bun run dev &

echo "Starting anime-vault server (:4040)..."
cd "$DIR/anime-vault/server" && node index.js &

echo "Starting server.py (:8765)..."
cd "$DIR" && python3 server.py &

echo "Starting app.py (:8080)..."
cd "$DIR" && python3 app.py &

echo ""
echo "=== All services started ==="
echo "  Flask gateway:  http://localhost:8080"
echo "  FastAPI (YTDL): http://localhost:8765"
echo "  AnimeVault:     http://localhost:4040"
echo "  hianime-API:    http://localhost:3030"
echo ""
echo "Press Ctrl+C to stop all services"
wait
