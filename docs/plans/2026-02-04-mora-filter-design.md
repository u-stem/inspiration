# モーラ数フィルター設計書

## 概要

検索結果をモーラ数（拍数）で絞り込む機能を追加する。
ラップのフロウや俳句の字数合わせに有用。

## 機能要件

- モーラ数の範囲（min/max）で検索結果をフィルタリング
- 日本語・英語（syllable_count）両方に対応
- デフォルトは制限なし（全件表示）

## 実装方針

### バックエンド

**schemas.py**
- `PatternSearchRequest` に `mora_min: int | None`, `mora_max: int | None` を追加
- `EnglishSearchRequest` にも同様に追加

**rhyme.py (router)**
- `search_rhymes`: マッチ後にモーラ数でフィルタリング
- `search_english_rhymes`: syllable_count でフィルタリング

### フロントエンド

**page.tsx**
- `moraMin`, `moraMax` の状態を追加
- 設定行にモーラ数フィルターUI追加（数値入力またはプリセット）

**useRhymeSearch.ts / useEnglishRhymeSearch.ts**
- 検索オプションに `moraMin`, `moraMax` を追加
- API呼び出し時にパラメータを含める

**types/index.ts**
- `SearchOptions` 型にモーラ範囲を追加

## UI設計

設定行に追加:
```
モーラ [  2  ] 〜 [  6  ]  または  [制限なし]
```

シンプルな数値入力2つ + 「制限なし」ボタン。

## 影響範囲

- backend/app/models/schemas.py
- backend/app/routers/rhyme.py
- frontend/src/app/page.tsx
- frontend/src/hooks/useRhymeSearch.ts
- frontend/src/hooks/useEnglishRhymeSearch.ts
- frontend/src/types/index.ts
