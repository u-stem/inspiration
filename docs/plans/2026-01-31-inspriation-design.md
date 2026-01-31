# 韻スピレーション 設計ドキュメント

## 概要

日本語の韻を生成するWebサービス。入力された単語から母音・子音パターンを解析し、韻を踏む単語を提案する。

## ターゲットユーザー

- ラッパー / ヒップホップアーティスト
- 作詞家 / シンガーソングライター

## コア機能

### 韻のモード

| モード | 説明 | 例 |
|--------|------|-----|
| 母音踏み | 母音パターンが一致 | 空(o-a) = 腹(o-a) |
| 子音踏み | 子音パターンが一致 | カラス(k-r-s) = キレス(k-r-s) |
| 完全踏み | 母音・子音の両方が一致 | 空(s-o-r-a) = 反(s-o-r-a) |
| ハイブリッド | 母音一致 + 子音類似でスコア化 | スコア順で表示 |

### 範囲指定

- 文字数指定
- 音節数指定
- 母音数指定
- 位置指定（頭韻・脚韻・中間韻）
- 上記の複合指定

### 韻の精度設定

- 完全一致からゆるい韻まで、ユーザーが選択可能
- 特殊音の扱いも設定可能
  - 伸ばし音の統一
  - 撥音（ん）の柔軟な扱い
  - 促音（っ）の考慮

### 出力形式

- 単語
- 読み仮名
- 母音パターン
- 子音パターン
- 使用例（Phase 2以降）
- スコア（Phase 3以降）

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                   フロントエンド                      │
│              Next.js (App Router)                   │
│         - 入力UI / 設定パネル / 結果表示             │
└─────────────────────┬───────────────────────────────┘
                      │ API Routes
┌─────────────────────▼───────────────────────────────┐
│                  バックエンド                        │
│               Next.js API Routes                    │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ 韻検索API   │  │ 母音解析    │  │ 設定管理   │  │
│  └──────┬──────┘  └─────────────┘  └────────────┘  │
└─────────┼───────────────────────────────────────────┘
          │
    ┌─────▼─────┐         ┌─────────────┐
    │ 韻辞書DB  │◄───────►│  LLM API    │
    │(Supabase) │  補完時  │  (Ollama)   │
    └───────────┘         └─────────────┘
```

### LLM連携

```
┌─────────────────────────────────────┐
│          LLM Service Layer          │
│   (共通インターフェース)              │
└──────────────┬──────────────────────┘
               │
   ┌───────────┼───────────┐
   ▼           ▼           ▼
┌──────┐  ┌────────┐  ┌─────────┐
│Ollama│  │Claude  │  │ OpenAI  │
│(dev) │  │  API   │  │   API   │
└──────┘  └────────┘  └─────────┘
```

開発時はOllama、本番では必要に応じてClaude APIなどに切り替え可能。

### 推奨Ollamaモデル

| モデル | サイズ | 用途 |
|--------|--------|------|
| qwen3:4b | ~2.5GB | 開発環境 |
| qwen3:8b | ~5GB | 本番環境（推奨） |
| qwen3:30b-a3b | ~18GB | 高品質が必要な場合 |

## データモデル

```sql
-- 単語テーブル
words
├── id: UUID
├── word: TEXT              -- 単語（例：「東京」）
├── reading: TEXT           -- 読み仮名（例：「とうきょう」）
├── vowels: TEXT            -- 母音パターン（例：「おういおう」）
├── vowels_normalized: TEXT -- 正規化母音（例：「おうおう」）
├── consonants: TEXT        -- 子音パターン（例：「t-k-」）
├── phonemes: JSONB         -- 音素詳細
├── mora_count: INT         -- モーラ数
├── category: TEXT[]        -- カテゴリ
└── created_at: TIMESTAMP

-- 音素詳細の例
{
  "morae": [
    {"char": "と", "vowel": "o", "consonant": "t"},
    {"char": "う", "vowel": "u", "consonant": null},
    {"char": "きょ", "vowel": "o", "consonant": "ky"},
    {"char": "う", "vowel": "u", "consonant": null}
  ]
}
```

## API設計

### POST /api/rhyme/search

**リクエスト：**
```json
{
  "word": "東京",
  "mode": "hybrid",
  "position": "suffix",
  "length": 4,
  "lengthType": "mora",
  "strictness": 0.7,
  "options": {
    "normalizeExtended": true,
    "flexibleNasal": true,
    "ignoreTsu": false
  },
  "limit": 20,
  "offset": 0
}
```

**レスポンス：**
```json
{
  "input": {
    "word": "東京",
    "reading": "とうきょう",
    "vowels": "o-u-o-u",
    "consonants": "t-ky"
  },
  "results": [
    {
      "word": "投稿",
      "reading": "とうこう",
      "vowels": "o-u-o-u",
      "consonants": "t-k",
      "score": 98,
      "matchType": "vowel_full",
      "examples": ["SNSに投稿", "投稿を続ける"]
    }
  ],
  "total": 24,
  "source": "dictionary"
}
```

### POST /api/rhyme/generate

辞書で足りない場合にLLM生成を呼ぶエンドポイント（同じレスポンス形式）

## ディレクトリ構成

```
inspriation/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── rhyme/
│   │           ├── search/route.ts
│   │           └── generate/route.ts
│   │
│   ├── components/
│   │   ├── SearchInput.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── ResultList.tsx
│   │   └── ResultCard.tsx
│   │
│   ├── lib/
│   │   ├── phoneme/
│   │   │   ├── analyzer.ts
│   │   │   ├── mapper.ts
│   │   │   └── normalizer.ts
│   │   │
│   │   ├── rhyme/
│   │   │   ├── searcher.ts
│   │   │   └── scorer.ts
│   │   │
│   │   ├── llm/
│   │   │   ├── interface.ts
│   │   │   ├── ollama.ts
│   │   │   └── factory.ts
│   │   │
│   │   └── db/
│   │       └── client.ts
│   │
│   └── types/
│       └── index.ts
│
├── scripts/
│   └── seed-dictionary.ts
│
├── public/
├── .env.local
├── package.json
└── README.md
```

## 開発フェーズ

### Phase 1: MVP

- 単語入力 → 韻検索
- 母音踏み / 子音踏み / ハイブリッドモード
- 末尾の音数指定（1〜8音）
- 基本的な特殊音設定（伸ばし音統一のみ）
- 結果表示（単語 + 読み + 母音/子音パターン）
- Ollama連携（辞書で不足時にLLM生成）

### Phase 2: 機能拡張

- 頭韻・中間韻対応
- 使用例の表示
- 検索履歴（ローカルストレージ）
- 詳細な特殊音設定

### Phase 3: 体験向上

- スコア表示とソート
- お気に入り保存
- キーボードショートカット
- PWA対応（オフライン利用）

### Phase 4: 将来拡張

- 意味を考慮した韻提案（LLM活用）
- フレーズ補完
- API公開
- モバイルアプリ

## 技術スタック

- **フロントエンド**: Next.js (App Router), React, TypeScript
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide Icons
- **データベース**: Supabase (PostgreSQL)
- **形態素解析**: kuromoji.js
- **LLM**: Ollama (qwen3)
- **デプロイ**: Vercel

## UI方針

- 絵文字は使用しない
- 必要に応じてLucide Iconsを使用
- シンプルで直感的なインターフェース
