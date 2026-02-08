# 韻スピレーション

**コマンドは必ず `bun run <script>` で実行する。`cd backend && ...` は禁止。**

## コマンド

```bash
bun run test            # テスト実行
bun run check           # typecheck + lint + test
bun run lint            # lint
bun run fmt             # フォーマット
bun run build:frontend  # フロントエンドビルド
bun run dev:frontend    # フロントエンド開発サーバー
bun run dev:backend     # バックエンド開発サーバー
bun run docker:up       # Docker 起動
bun run docker:down     # Docker 停止
bun run index:build     # 韻インデックス構築
```

## 技術スタック

- フロントエンド: Next.js 16 (App Router), TypeScript, Tailwind CSS
- バックエンド: FastAPI (Python 3.12), SudachiPy, SQLite
- パッケージ管理: bun (frontend), uv (backend)

## 構成

```
frontend/src/{app,components,hooks,lib,types}/
backend/app/{core,models,routers,services}/, tests/, scripts/
```

## コード規約

- Python: 型ヒント必須、Pydantic スキーマ、エラーメッセージ・ログは英語
- TypeScript: strict mode、React Server Components 優先、UI テキストは日本語

## テスト方針

- バックエンド: 音素解析・韻マッチングのユニットテスト必須
- フロントエンド: コンポーネントの振る舞いテスト
