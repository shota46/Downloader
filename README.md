# Downloader

YouTube + Anime 統合ダウンロードプラットフォーム

## アーキテクチャ

| サービス | ポート | 技術 | 役割 |
|----------|--------|------|------|
| app.py | 8080 | Flask | 統合ゲートウェイ + フロントエンド |
| server.py | 8765 | FastAPI | YouTube高機能DL (WebSocket, メタデータ) |
| anime-vault | 4040 | Express | アニメファイル管理 (SFTP, ZIP) |
| hianime-API | 3030 | Bun/Hono | アニメストリーム抽出API |

## セットアップ

```bash
# Python依存
pip install -r requirements.txt

# Node依存
cd anime-vault/server && npm install && cd ../..
cd hianime-API && bun install && cd ..

# ffmpegが必要
brew install ffmpeg
```

## 起動

```bash
# 一括起動
bash start.sh

# 一括停止
bash stop.sh
```

ブラウザで http://localhost:8080 にアクセス

## 機能

- **YouTube**: URL指定で動画/音声をダウンロード (簡易モード)
- **YT Advanced**: WebSocketリアルタイム進捗、メタデータ埋め込み、Discord通知
- **Anime**: hianime検索・ストリーム取得・HLS→MP4ダウンロード
- **Vault**: アニメファイル管理、ZIP一括DL、SFTP転送
- **Downloads**: 全ソースのDL済みファイル一覧
