# ⬡ AnimeVault

> アニメダウンロードマネージャー — hianime スクレイパー + React UI + Express バックエンド

---

## 構成

```
anime-vault/
├── server/           # Express バックエンド (port 4040)
│   ├── index.js      # メインサーバー
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── client/           # React フロントエンド (Vite)
│   ├── src/
│   │   ├── App.jsx   # メインUI (3400行)
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── setup.sh          # 初期セットアップ
└── dev.sh            # 開発用一括起動
```

---

## クイックスタート

### 方法①: セットアップスクリプト (推奨)

```bash
chmod +x setup.sh dev.sh
bash setup.sh
```

その後：
```bash
bash dev.sh
```

### 方法②: 手動

```bash
# 依存パッケージ
cd server && npm install && cd ..
cd client && npm install && cd ..

# サーバー設定
cp server/.env.example server/.env
# ANIME_DIR を編集 (アニメファイルの保存先)

# サーバー起動 (port 4040)
cd server && node index.js &

# フロントエンド開発モード起動 (port 5173)
cd client && npm run dev
```

### 方法③: Docker Compose

```bash
docker compose up --build
```

- UI:     http://localhost:5173
- API:    http://localhost:4040

---

## API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/api/files` | ファイル一覧 |
| DELETE | `/api/files/:filename` | ファイル削除 |
| GET | `/api/download/:filename` | ファイルDL (Range対応) |
| POST | `/api/zip` | ZIP一括DL |
| GET | `/api/queue` | キュー取得 |
| POST | `/api/queue` | キュー追加 |
| DELETE | `/api/queue/:id` | キュー削除 |
| POST | `/api/sftp/connect` | SFTP接続テスト |
| POST | `/api/sftp/ls` | SFTPディレクトリ一覧 |
| POST | `/api/sftp/get` | SFTPからローカルへコピー |
| POST | `/api/sftp/put` | ローカルからSFTPへ転送 |
| GET | `/api/sysinfo` | CPU/Disk情報 |
| POST | `/api/meta/write` | ffmpeg メタデータ書き込み |

### ZIP API の例

```bash
curl -X POST http://localhost:4040/api/zip \
  -H "Content-Type: application/json" \
  -d '{"files":["進撃の巨人 Ep01 [1080p].mp4"],"outputName":"attack.zip"}' \
  --output attack.zip
```

---

## hianime-API のセットアップ

```bash
git clone https://github.com/yahyaMomin/hianime-API
cd hianime-API
bun install
bun run dev   # port 3030 で起動
```

> Bun が未インストールの場合: `curl -fsSL https://bun.sh/install | bash`

---

## ファイル構成ルール

`ANIME_DIR` (デフォルト: `./data/anime`) に以下の形式で配置：

```
data/anime/
├── 進撃の巨人/
│   ├── 進撃の巨人 Ep01 [1080p].mp4
│   └── 進撃の巨人 Ep02 [1080p].mp4
└── チェンソーマン Ep01 [1080p].mp4   # フラットでもOK
```

ファイル名は `{タイトル} Ep{番号} [{画質}].mp4` 形式推奨。

---

## SFTP 設定

設定ページで以下を入力：

| 項目 | 例 |
|------|----|
| ホスト | `192.168.1.100` または Tailscale IP |
| ポート | `22` |
| ユーザー名 | `pi`, `ubuntu`, etc. |
| パスワード | ※SSH鍵使用時は空欄 |
| SSH鍵パス | `~/.ssh/id_rsa` |
| リモートパス | `/media/anime` |

---

## 動作要件

| 項目 | 要件 |
|------|------|
| Node.js | 18 以上 |
| ffmpeg | メタデータ書き込みに必要 |
| OS | Linux / macOS / Windows (WSL2) |
| RAM | 512MB 以上推奨 |

---

## ライセンス

MIT
