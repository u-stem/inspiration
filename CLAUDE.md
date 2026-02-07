# 韻スピレーション - プロジェクト固有設定

## プロジェクト概要

日本語の韻を生成するWebアプリケーション。入力された単語から母音・子音パターンを解析し、韻を踏む単語を辞書から検索・提案する。

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| バックエンド | FastAPI (Python 3.12) |
| 形態素解析 | SudachiPy + SudachiDict-full |
| 辞書データ | NEologd seed (218万語) |
| 韻インデックス | SQLite |
| パッケージ管理 | bun (frontend), uv (backend) |
| コンテナ | Docker, Docker Compose |

## ディレクトリ構成

```
inspiration/
├── frontend/                    # Next.js フロントエンド
│   ├── src/
│   │   ├── app/                 # App Router ページ
│   │   ├── components/          # React コンポーネント
│   │   ├── hooks/               # カスタムフック
│   │   ├── lib/                 # ユーティリティ
│   │   └── types/               # 型定義
│   └── Dockerfile
├── backend/                     # FastAPI バックエンド
│   ├── app/
│   │   ├── core/                # 設定
│   │   ├── models/              # Pydantic スキーマ
│   │   ├── routers/             # API エンドポイント
│   │   └── services/            # ビジネスロジック
│   ├── scripts/                 # インデックス構築スクリプト
│   ├── tests/                   # テスト
│   └── Dockerfile
├── docker-compose.yml
├── package.json                 # ルートスクリプト
├── CLAUDE.md
└── README.md
```

## コマンド実行ルール

**重要**: コマンドは必ずルートの `package.json` に定義されたスクリプトを使用すること。

```bash
# 正しい
bun run test
bun run lint

# 間違い（直接cdして実行しない）
cd backend && uv run pytest
```

## 開発コマンド

ルートディレクトリから実行可能:

```bash
# Docker
bun run docker:up       # 全サービス起動（バックグラウンド）
bun run docker:down     # 停止
bun run docker:logs     # ログ確認
bun run dev             # 全サービス起動（フォアグラウンド）

# ローカル開発
bun run dev:frontend    # フロントエンド開発サーバー
bun run dev:backend     # バックエンド開発サーバー
bun run build:frontend  # フロントエンドビルド

# テスト・検証
bun run test            # テスト実行
bun run test:v          # テスト実行（詳細）
bun run check           # typecheck + lint + test（CI用）
bun run lint            # 全体lint
bun run fmt             # フォーマット

# その他
bun run install:all     # 全依存関係インストール
bun run index:build     # 韻インデックス構築
```

### Docker内でのコマンド

```bash
docker compose exec backend uv run pytest
docker compose exec backend uv run python scripts/build_index.py
```

## コード規約

### Python (backend)

- 型ヒント必須
- Pydantic でスキーマ定義
- pytest でテスト
- エラーメッセージ・ログは英語

### TypeScript (frontend)

- 厳格な型付け（strict mode）
- React Server Components 優先
- UIテキストは日本語

## バックエンドルーター構成

| ルーター | ファイル | 責務 |
|----------|----------|------|
| `rhyme` | `routers/rhyme.py` | 音素解析、インデックス更新 |
| `japanese` | `routers/japanese.py` | 日本語韻検索 |
| `english` | `routers/english.py` | 英語韻検索 |
| `lyrics` | `routers/lyrics.py` | 歌詞解析 |

共通ロジックは `services/search_utils.py`（パターン抽出・読み解析）と `services/similarity.py`（類似度算出）に集約。

## API設計

ベースURL: `http://localhost:8000/api`

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/rhyme/search` | POST | 日本語韻検索 |
| `/rhyme/search/english` | POST | 英語韻検索 |
| `/rhyme/analyze` | GET | 単語の音素解析 |
| `/rhyme/update-index` | POST | インデックス更新（要認証） |
| `/lyrics/analyze` | POST | 歌詞テキストの形態素解析・韻パターン抽出 |

## テスト方針

- バックエンド: 音素解析・韻マッチングのユニットテスト必須
- フロントエンド: コンポーネントの振る舞いテスト
- 手動テスト: 「東京」→「投稿」「報告」などが出ることを確認
