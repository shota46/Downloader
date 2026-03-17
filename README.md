# Downloader

YouTube + Anime 統合ダウンロードプラットフォーム。LAN内のどのデバイス（PC・スマホ・タブレット）からでもブラウザでアクセスしてダウンロードできる。

## デプロイ (Render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/Downloader)

### 手動デプロイ手順

1. GitHubにリポジトリをpush
2. [Render](https://render.com)でアカウント作成
3. 「New」→「Web Service」→ GitHubリポジトリ選択
4. 設定:
   - **Environment**: Docker
   - **Plan**: Free
   - **Health Check Path**: `/api/health`
5. 「Create Web Service」をクリック

### 注意点

- **15分無操作でスリープ**（初回アクセス時に30秒待機）
- **ストレージは一時的**（DL後すぐブラウザに保存）
- **750時間/月無料**

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│  Browser (PC / スマホ)                                   │
│  http://<LAN IP>:8080                                    │
└───────────────────┬─────────────────────────────────────┘
                    │ /api/*
┌───────────────────▼─────────────────────────────────────┐
│  Flask Gateway (app.py :8080)                            │
│  ┌─ React SPA 配信 (frontend/dist)                       │
│  ├─ /api/ytdl/*    → server.py :8765                     │
│  ├─ /api/anime/*   → consumet-api :3000                  │
│  ├─ /api/vault/*   → anime-vault :4040                   │
│  └─ /api/anime/download → ffmpeg (HLS→MP4 変換)          │
└─────────────────────────────────────────────────────────┘
         │                │               │
    ┌────▼────┐     ┌────▼────┐    ┌────▼─────┐
    │server.py│     │consumet │    │anime-vault│
    │FastAPI  │     │api      │    │Express    │
    │:8765    │     │:3000    │    │:4040      │
    │         │     │         │    │           │
    │yt-dlp   │     │animekai │    │ファイル管理│
    │download │     │animepahe│    │ZIP        │
    │metadata │     │         │    │メタデータ  │
    └─────────┘     └─────────┘    └───────────┘
```

| サービス | ポート | 技術 | 役割 |
|----------|--------|------|------|
| app.py | 8080 | Flask | 統合ゲートウェイ + React SPA 配信 |
| server.py | 8765 | FastAPI | YouTube DL (yt-dlp, メタデータ) |
| anime-vault | 4040 | Express | アニメファイル管理 (ZIP) |
| consumet-api | 3000 | Fastify | アニメストリーム抽出API |

## セットアップ

```bash
# 依存関係インストール
pip install flask requests        # Python
cd anime-vault/server && npm install && cd ../..
cd hianime-API && bun install && cd ..
cd frontend && npm install && cd ..

# ffmpeg が必須（アニメHLSダウンロードに使用）
brew install ffmpeg

# フロントエンドビルド
cd frontend && npm run build && cd ..
```

## 起動

```bash
bash start.sh        # 全サービス一括起動
bash stop.sh         # 一括停止
```

起動後、ブラウザで `http://localhost:8080` にアクセス。
LAN内の他デバイスからは `http://<サーバーのIP>:8080` でアクセス可能。

## 使い方

### YouTube ダウンロード

1. **YouTube DL** タブを選択
2. **新規ダウンロード** ページでYouTube URLを貼り付け
3. フォーマットを選択（1080p / 720p / 480p / 360p / mp3 / m4a）
4. 「ダウンロード開始」ボタンをクリック
5. **キュー** ページで進捗を確認
6. **ファイル** ページで完了したファイルを端末にDL

プレイリストの場合は範囲指定（例: 1〜10番目）も可能。

### アニメ ダウンロード

#### 方法1: 検索から
1. **AnimeVault** タブを選択
2. **ブラウズ** ページでアニメ名を検索
3. アニメカードをクリック → エピソード一覧が表示される
4. エピソードを選択してキューに追加
5. ffmpegがHLSストリームをMP4に変換してDL

#### 方法2: URL貼り付け
1. hianime.to のURLをそのまま検索バーに貼り付け
   ```
   https://hianime.to/watch/hirogaru-sky-precure-18320?ep=101107
   ```
2. 「開く」ボタン or Enterキーで自動的にアニメ情報を取得
3. エピソード選択 → DL開始

#### 方法3: 📋ペーストボタン
1. スマホでhianime.toのURLをコピー
2. ブラウズページの📋ボタンをタップ → URLが自動入力
3. あとは方法2と同じ

### ダウンロード済みファイルの端末への保存

- **ファイル** ページで ⬇ ボタンをタップ → ブラウザ経由で端末にDL
- 一括DL: ファイルを複数選択 → 「一括DL」ボタン
- SFTP転送: 📡 ボタンからSSH経由で別サーバーに転送

## 技術詳細

### アニメDLフロー

```
URL/検索 → hianime-API(スクレイピング) → エピソードID取得
         → ストリームURL取得 (hd-2サーバー優先)
         → Flask が ffmpeg を起動
         → HLS (m3u8) → MP4 変換
         → downloads/anime/ に保存
         → ブラウザからHTTP DL可能
```

- **hd-2 (netmagcdn)** を優先使用。hd-1 (megacloud CDN) はサーバーサイドからのffmpegアクセスで403を返すため。
- 進捗はffmpegのstderrからDuration/timeを解析して算出。

### YouTube DLフロー

```
YouTube URL → server.py (yt-dlp) → ダウンロード
           → メタデータ自動埋め込み (ffprobe/ffmpeg)
           → downloads/youtube/<チャンネル名>/ に保存
           → ブラウザからHTTP DL可能
```

### レスポンシブ対応

- **デスクトップ**: フルサイドバー + 全カラム表示
- **タブレット (≤1024px)**: サイドバーアイコン化、テーブル列削減
- **モバイル (≤768px)**: サイドバー→ボトムナビ、モーダルフルスクリーン化

## ディレクトリ構成

```
Downloader/
├── app.py                 # Flask統合ゲートウェイ
├── server.py              # FastAPI YouTube DLサーバー
├── start.sh / stop.sh     # 起動・停止スクリプト
├── downloads/
│   ├── anime/             # アニメDL先
│   └── youtube/           # YouTube DL先
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # モジュール切替
│   │   ├── youtube/       # YouTube DL UI
│   │   └── animevault/    # AnimeVault UI
│   └── dist/              # ビルド済み (Flask配信)
├── hianime-API/           # アニメスクレイピングAPI (Bun)
└── anime-vault/
    └── server/            # ファイル管理サーバー (Express)
```
