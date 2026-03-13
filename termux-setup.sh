#!/usr/bin/env bash
# ============================================================
#  Downloader - Termux ワンタッチセットアップ
#  コピペするだけで全部動きます (root化不要)
# ============================================================
set -eo pipefail 2>/dev/null || true

G='\033[0;32m'; C='\033[0;36m'; R='\033[0;31m'; N='\033[0m'
ok()  { echo -e "${G}✓${N} $1"; }
err() { echo -e "${R}✗${N} $1"; exit 1; }
info(){ echo -e "${C}→${N} $1"; }

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Downloader - Termux Setup              ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. パッケージ ──
info "システムパッケージをインストール中..."
pkg update -y && pkg upgrade -y
pkg install -y git nodejs-lts python ffmpeg
ok "システムパッケージ完了"

# ── 2. Python パッケージ ──
info "Python パッケージをインストール中..."
pip install flask requests yt-dlp fastapi uvicorn aiofiles httpx psutil mutagen
ok "Python パッケージ完了"

# ── 3. リポジトリ取得 ──
INSTALL_DIR="$HOME/Downloader"
if [ -d "$INSTALL_DIR" ]; then
  info "既存のリポジトリを更新中..."
  cd "$INSTALL_DIR" && git pull
else
  info "リポジトリをクローン中..."
  git clone https://github.com/hirorogo/Downloader.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi
ok "リポジトリ取得完了"

# ── 4. Node.js 依存 ──
info "hianime-API の依存をインストール中..."
cd "$INSTALL_DIR/hianime-API" && npm install --production
ok "hianime-API 完了"

info "anime-vault server の依存をインストール中..."
cd "$INSTALL_DIR/anime-vault/server" && npm install --production
ok "anime-vault 完了"

# ── 5. フロントエンドビルド ──
info "フロントエンドをビルド中..."
cd "$INSTALL_DIR/frontend" && npm install && npm run build
ok "フロントエンド完了"

# ── 6. ダウンロードディレクトリ作成 ──
mkdir -p "$INSTALL_DIR/downloads/anime"
mkdir -p "$INSTALL_DIR/downloads/youtube"
ok "ダウンロードディレクトリ作成完了"

# ── 7. ストレージアクセス ──
if [ ! -d "$HOME/storage" ]; then
  info "ストレージ権限を設定中..."
  termux-setup-storage || true
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   セットアップ完了！                       ║"
echo "╠══════════════════════════════════════════╣"
echo "║                                          ║"
echo "║   起動コマンド:                            ║"
echo "║   cd ~/Downloader && ./start.sh           ║"
echo "║                                          ║"
echo "║   アクセス:                                ║"
echo "║   http://localhost:8080                   ║"
echo "║                                          ║"
echo "║   スマホのIP確認:                          ║"
echo "║   ifconfig wlan0 | grep inet             ║"
echo "║                                          ║"
echo "║   Tips:                                   ║"
echo "║   termux-wake-lock  # 画面オフでも維持    ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 起動するか確認
read -p "今すぐ起動しますか？ (y/N): " REPLY
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
  cd "$INSTALL_DIR"
  exec ./start.sh
fi
