# 日本語→英語韻検索機能 設計書

## 概要

日本語を入力し、その母音パターンに一致する英語単語を検索する機能。
日本語ラップで英語を混ぜて韻を踏む際に活用できる。

## 技術選定

- **発音辞書**: CMU Pronouncing Dictionary（約13万語）
- **発音形式**: ARPAbet → 日本語5母音にマッピング
- **インデックス**: SQLite（日本語と同様）
- **マッチング**: 既存のPatternMatcherを再利用

## データ構造

### ARPAbet → 日本語母音マッピング

```
AA (father)  → a
AE (cat)     → a
AH (but)     → a
AO (dog)     → o
AW (cow)     → a-u
AY (my)      → a-i
EH (bed)     → e
ER (bird)    → a
EY (say)     → e-i
IH (bit)     → i
IY (bee)     → i
OW (go)      → o-u
OY (boy)     → o-i
UH (book)    → u
UW (food)    → u
```

### 英語インデックススキーマ

```sql
CREATE TABLE english_rhyme_index (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL,
    pronunciation TEXT NOT NULL,
    vowels TEXT NOT NULL,
    consonants TEXT NOT NULL,
    syllable_count INTEGER NOT NULL
);

CREATE INDEX idx_english_vowels ON english_rhyme_index(vowels);
```

## API設計

### リクエスト

```python
class SearchRequest(BaseModel):
    reading: str
    pattern: str
    language: Literal["ja", "en"] = "ja"
    page: int = 1
    per_page: int = 50
    sort: str = "relevance"
```

### レスポンス（英語）

```python
class EnglishRhymeResult(BaseModel):
    word: str           # "rainbow"
    pronunciation: str  # "R EY1 N B OW2"
    katakana: str       # "レインボウ"
    vowel_pattern: str  # "e-i-o-u"
    syllable_count: int # 2
```

## ファイル構成

### バックエンド（新規）

```
backend/
├── app/services/
│   ├── english_phoneme.py    # ARPAbet→日本語母音変換
│   └── english_rhyme.py      # 英語韻インデックス
├── scripts/
│   └── build_english_index.py
├── data/
│   └── cmudict.txt
└── tests/
    ├── test_english_phoneme.py
    └── test_english_rhyme.py
```

### フロントエンド（変更）

```
frontend/src/
├── components/
│   └── LanguageTab.tsx       # 新規
├── hooks/
│   └── useRhymeSearch.ts     # language追加
└── app/
    └── page.tsx              # タブ状態管理
```

## UI

タブ切り替え式で日本語/英語を選択：

```
[日本語] [English]

検索結果:
┌────────────────────────────────┐
│ rainbow  レインボウ  e-i-o-u   │
│ tokyo    トウキョウ  o-u-o-u   │
└────────────────────────────────┘
```

## 実装順序

1. Phase 1: バックエンド基盤（CMU辞書、変換ロジック、インデックス構築）
2. Phase 2: バックエンドAPI（検索エンドポイント拡張）
3. Phase 3: フロントエンド（タブUI、結果表示）
4. Phase 4: 統合テスト
