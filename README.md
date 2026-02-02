# 韻スピレーション

日本語の韻を生成するWebアプリケーション。

## 機能

- 入力された単語から母音・子音パターンを解析
- 韻を踏む単語を辞書から検索・提案
- パターンベースの柔軟な韻検索（頭韻・脚韻・含む）
- 検索履歴・お気に入り機能

## 技術スタック

- フロントエンド: Next.js 16, TypeScript, Tailwind CSS
- バックエンド: FastAPI (Python 3.12)
- 形態素解析: SudachiPy + SudachiDict-full
- 韻インデックス: SQLite

### 辞書データ

| 辞書 | 説明 | 有効化 |
|------|------|--------|
| [NEologd seed](https://github.com/neologd/mecab-ipadic-neologd) | 新語・固有名詞を含む大規模辞書（約218万語） | デフォルト |
| [IPADIC](https://github.com/taku910/mecab) | MeCab標準辞書 | デフォルト |
| [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project) | 日英辞典（追加語彙） | `--jmdict` オプション |

インデックス構築時のオプション:
```bash
# 基本（NEologd + IPADIC）
bun run index:build

# JMdictを含める
cd backend && uv run python scripts/build_index.py --jmdict

# NEologdのみ（IPADICなし）
cd backend && uv run python scripts/build_index.py --no-ipadic
```

## セットアップ

### 必要条件

- Docker & Docker Compose
- bun (ルートのスクリプト実行用)

### 起動

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

必要条件:
- Node.js 20+
- Python 3.12+
- bun
- uv

1. 環境変数の設定:
```bash
# 上記「環境変数の設定」を参照
```

2. 依存関係のインストール:
```bash
bun run install:all
```

3. インデックス構築（初回のみ）:
```bash
bun run index:build
```

4. 起動:
```bash
bun run dev:backend    # バックエンド (別ターミナル)
bun run dev:frontend   # フロントエンド (別ターミナル)
```

その他のコマンド:
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

辞書インデックスを更新

```
POST /api/rhyme/update-index?download=false
```

## ライセンス

MIT
