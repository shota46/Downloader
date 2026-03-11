#!/bin/bash
# Downloader - 全サービス一括停止
pkill -f "bun.*hianime" 2>/dev/null
pkill -f "node.*index.js" 2>/dev/null
pkill -f "python.*server.py" 2>/dev/null
pkill -f "python.*app.py" 2>/dev/null
echo "All services stopped"
