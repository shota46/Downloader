#!/bin/bash

# Start consumet-api (background)
cd /app/consumet-api
npm run start &
echo "consumet-api started on :3000"

# Start anime-vault (background)
cd /app/anime-vault/server
ANIME_DIR=/app/downloads/anime node index.js &
echo "anime-vault started on :4040"

# Start FastAPI server.py (background)
cd /app
python3 server.py &
echo "server.py started on :8765"

# Wait for services to be ready
sleep 3

# Start Flask app (foreground)
cd /app
python3 app.py
