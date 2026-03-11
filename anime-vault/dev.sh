#!/usr/bin/env bash
# dev.sh  ─  サーバー + Vite dev server を同時起動
trap 'kill 0' EXIT

echo "▸ AnimeVault サーバー (port 4040) 起動..."
cd server && node index.js &
SERVER_PID=$!

sleep 1

echo "▸ Vite dev server (port 5173) 起動..."
cd ../client && npm run dev &
CLIENT_PID=$!

echo ""
echo "  サーバー: http://localhost:4040"
echo "  UI:       http://localhost:5173"
echo "  Ctrl+C で両方停止"
echo ""

wait
