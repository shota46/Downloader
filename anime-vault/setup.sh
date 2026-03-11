#!/usr/bin/env bash
# ============================================================
#  AnimeVault  ─  Linux セットアップスクリプト
#  使い方: bash setup.sh
# ============================================================
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RESET='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   ⬡ AnimeVault  Setup                   ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ─ Node.js チェック ─
if ! command -v node &>/dev/null; then
  echo -e "${AMBER}Node.js が見つかりません。インストールしてください:${RESET}"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${AMBER}Node.js 18以上が必要です (現在: $(node -v))${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${RESET}"

# ─ ffmpeg チェック ─
if command -v ffmpeg &>/dev/null; then
  echo -e "${GREEN}✓ ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')${RESET}"
else
  echo -e "${AMBER}⚠ ffmpeg が見つかりません (メタデータ書き込み機能が使えません)${RESET}"
  echo "  sudo apt-get install -y ffmpeg   # Ubuntu/Debian"
  echo "  sudo dnf install -y ffmpeg       # Fedora/RHEL"
fi

# ─ アニメ保存ディレクトリ ─
echo ""
read -rp "アニメファイル保存先 [デフォルト: $(pwd)/data/anime] : " ANIME_DIR_INPUT
ANIME_DIR="${ANIME_DIR_INPUT:-$(pwd)/data/anime}"
mkdir -p "$ANIME_DIR"
echo -e "${GREEN}✓ ANIME_DIR: $ANIME_DIR${RESET}"

# ─ サーバー .env 生成 ─
cat > server/.env <<EOF
PORT=4040
ANIME_DIR=$ANIME_DIR
HIANIME_API=http://localhost:3030
DISCORD_WEBHOOK=
EOF
echo -e "${GREEN}✓ server/.env を生成しました${RESET}"

# ─ サーバー依存パッケージインストール ─
echo ""
echo -e "${CYAN}▸ サーバー依存パッケージをインストール中...${RESET}"
cd server && npm install && cd ..
echo -e "${GREEN}✓ server/node_modules インストール完了${RESET}"

# ─ クライアント依存パッケージインストール ─
echo ""
echo -e "${CYAN}▸ クライアント依存パッケージをインストール中...${RESET}"
cd client && npm install && cd ..
echo -e "${GREEN}✓ client/node_modules インストール完了${RESET}"

# ─ React ビルド ─
echo ""
echo -e "${CYAN}▸ React フロントエンドをビルド中...${RESET}"
cd client && npm run build && cd ..
echo -e "${GREEN}✓ client/dist ビルド完了${RESET}"

# ─ systemd サービス (任意) ─
echo ""
read -rp "systemd サービスを登録しますか? (ログイン不要で自動起動) [y/N]: " SYSTEMD
if [[ "$SYSTEMD" =~ ^[Yy]$ ]]; then
  WORK_DIR=$(pwd)
  NODE_BIN=$(which node)
  cat > /tmp/animevault.service <<EOF
[Unit]
Description=AnimeVault Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORK_DIR/server
ExecStart=$NODE_BIN index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
  sudo cp /tmp/animevault.service /etc/systemd/system/animevault.service
  sudo systemctl daemon-reload
  sudo systemctl enable animevault
  sudo systemctl start animevault
  echo -e "${GREEN}✓ systemd サービス 'animevault' を登録・起動しました${RESET}"
  echo "  管理コマンド:"
  echo "    sudo systemctl status animevault"
  echo "    sudo systemctl restart animevault"
  echo "    journalctl -u animevault -f"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗"
echo "║  ✓ セットアップ完了!                            ║"
echo "╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  サーバー起動:    ${CYAN}cd server && node index.js${RESET}"
echo -e "  開発モード:      ${CYAN}cd client && npm run dev${RESET}"
echo -e "  本番アクセス:    ${CYAN}http://localhost:4040${RESET}  (React + API 両方)"
echo -e "  開発アクセス:    ${CYAN}http://localhost:5173${RESET}  (Vite dev server)"
echo ""
echo -e "  hianime-API も必要な場合:"
echo -e "  ${CYAN}git clone https://github.com/yahyaMomin/hianime-API${RESET}"
echo -e "  ${CYAN}cd hianime-API && bun install && bun run dev${RESET}"
echo ""
