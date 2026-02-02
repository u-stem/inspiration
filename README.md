# 韻スピレーション

日本語の韻を生成するWebアプリケーション。

## 機能

- 入力された単語から母音・子音パターンを解析
- 韻を踏む単語を辞書から検索・提案
- パターンベースの柔軟な韻検索（頭韻・脚韻・含む）
- 検索履歴・お気に入り機能

## 技術スタック

- **フロントエンド**: Next.js 15, TypeScript, Tailwind CSS
- **バックエンド**: FastAPI (Python 3.12)
- **形態素解析**: SudachiPy + SudachiDict-full
- **辞書データ**: NEologd seed (218万語)
- **韻インデックス**: SQLite

## セットアップ

### 必要条件

- Docker & Docker Compose
- bun (ルートのスクリプト実行用)

### 1. 環境変数の設定

```bash
# バックエンド
cp backend/.env.sample backend/.env
# ADMIN_API_KEY に任意の文字列を設定

# フロントエンド
cp frontend/.env.local.sample frontend/.env.local
# ADMIN_API_KEY にバックエンドと同じ値を設定
```

### 2. 起動

```bash
bun run docker:up    # 全サービスを起動
bun run docker:logs  # ログ確認
bun run docker:down  # 停止
```

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000

### ローカル開発 (Docker不使用時)

<details>
<summary>詳細を表示</summary>

**必要条件:**
- Node.js 20+
- Python 3.12+
- bun
- uv

**1. 環境変数の設定:**
```bash
cp backend/.env.sample backend/.env
cp frontend/.env.local.sample frontend/.env.local
# 両方の ADMIN_API_KEY に同じ値を設定
```

**2. 依存関係のインストール:**
```bash
bun run install:all
```

**3. インデックス構築（初回のみ）:**
```bash
bun run index:build
```

**4. 起動:**
```bash
bun run dev:backend    # バックエンド (別ターミナル)
bun run dev:frontend   # フロントエンド (別ターミナル)
```

**その他のコマンド:**
```bash
bun run test           # テスト実行
bun run lint           # lint
bun run check          # typecheck + lint + test
```

</details>

## 使い方

1. http://localhost:3000 にアクセス
2. 検索ボックスにひらがなを入力（例: とうきょう）
3. パターンを調整（子音・母音の固定/任意、位置）
4. 検索結果から韻を踏む単語を確認

## API

### POST /api/rhyme/search

パターンベースの韻検索

```json
{
  "reading": "とうきょう",
  "pattern": "*ouo",
  "sort": "relevance",
  "limit": 20,
  "offset": 0
}
```

### GET /api/rhyme/analyze

ひらがなの音素を解析

```
GET /api/rhyme/analyze?reading=とうきょう
```

### POST /api/rhyme/update-index

インデックスを更新（要認証: `X-API-Key` ヘッダー）

```
POST /api/rhyme/update-index?download=false
```

## ライセンス

MIT
