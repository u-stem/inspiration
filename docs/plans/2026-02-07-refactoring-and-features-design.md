# 韻スピレーション リファクタリング・機能追加 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** コード品質改善（リファクタリング）と3つの新機能（類似度スコア、音声読み上げ、創作記録）を段階的に実装する。

**Architecture:** Phase 1でバックエンド・フロントエンド両方のリファクタリングを実施し、保守性を高める。Phase 2-4で新機能を追加する。全データはlocalStorage管理（認証なし）。APIインターフェースの破壊的変更は行わない。

**Tech Stack:** Next.js 16 (App Router) / TypeScript / Tailwind CSS / FastAPI / SQLite / SudachiPy / Web Speech API

---

## Phase 1: リファクタリング

### Task 1: バックエンドルーター分割 - 共有ユーティリティの抽出

`backend/app/routers/rhyme.py` (521行) から、複数ルーターで共有するヘルパー関数を `backend/app/services/search_utils.py` に抽出する。

**Files:**
- Create: `backend/app/services/search_utils.py`
- Test: `backend/tests/test_search_utils.py`

**Step 1: テストを書く**

```python
# backend/tests/test_search_utils.py
from app.services.search_utils import word_priority, extract_patterns
from app.services.pattern import PatternMatcher


class TestWordPriority:
    def test_kanji_only_highest_priority(self) -> None:
        priority = word_priority("東京")
        assert priority[0] > 0

    def test_symbol_lowest_priority(self) -> None:
        priority = word_priority("☆東京☆")
        assert priority[0] == -2

    def test_digit_low_priority(self) -> None:
        priority = word_priority("123")
        assert priority[0] == -1

    def test_shorter_preferred(self) -> None:
        p1 = word_priority("東")
        p2 = word_priority("東京都")
        assert p1[0] >= p2[0]


class TestExtractPatterns:
    def test_suffix_pattern(self) -> None:
        matcher = PatternMatcher()
        parsed = matcher.parse("*kusa")
        vowel, consonant, is_prefix, is_suffix = extract_patterns(parsed)
        assert vowel == "u-a"
        assert is_suffix is True
        assert is_prefix is False

    def test_prefix_pattern(self) -> None:
        matcher = PatternMatcher()
        parsed = matcher.parse("kusa*")
        vowel, consonant, is_prefix, is_suffix = extract_patterns(parsed)
        assert vowel == "u-a"
        assert is_prefix is True
        assert is_suffix is False
```

**Step 2: テスト実行 - 失敗を確認**

Run: `bun run test -- tests/test_search_utils.py -v`
Expected: FAIL (module not found)

**Step 3: 実装**

`backend/app/services/search_utils.py` に `_word_priority` と `_extract_patterns` を `routers/rhyme.py` から移動。関数名を `word_priority`, `extract_patterns` にリネーム（publicに）。

**Step 4: テスト実行 - パスを確認**

Run: `bun run test -- tests/test_search_utils.py -v`
Expected: PASS

**Step 5: コミット**

```bash
git add backend/app/services/search_utils.py backend/tests/test_search_utils.py
git commit -m "refactor: 共有検索ユーティリティをservices層に抽出"
```

---

### Task 2: バックエンドルーター分割 - 日本語・英語・管理ルーターに分割

`routers/rhyme.py` を3つのルーターに分割する。APIパスは変更しない。

**Files:**
- Create: `backend/app/routers/japanese.py`
- Create: `backend/app/routers/english.py`
- Modify: `backend/app/routers/rhyme.py` (update-index + analyze のみ残す)
- Modify: `backend/app/main.py` (新ルーター登録)

**Step 1: `backend/app/routers/japanese.py` を作成**

`routers/rhyme.py` から `search_rhymes` エンドポイントと `_analyze_reading` ヘルパーを移動。`_word_priority` と `_extract_patterns` は `search_utils` からimport。

ルーター定義: `router = APIRouter(prefix="/rhyme", tags=["rhyme"])`

**Step 2: `backend/app/routers/english.py` を作成**

`routers/rhyme.py` から `search_english_rhymes` と `_calculate_english_match_score` を移動。

ルーター定義: `router = APIRouter(prefix="/rhyme", tags=["rhyme-english"])`

**Step 3: `routers/rhyme.py` を更新**

`analyze_reading`, `update_index_endpoint` のみ残す。移動した関数を削除。

**Step 4: `main.py` を更新**

```python
from app.routers import english, japanese, rhyme

app.include_router(rhyme.router, prefix=settings.api_prefix)
app.include_router(japanese.router, prefix=settings.api_prefix)
app.include_router(english.router, prefix=settings.api_prefix)
```

**Step 5: 全テスト実行**

Run: `bun run test -v`
Expected: ALL PASS (APIパス変更なし)

**Step 6: lint + format**

Run: `bun run lint:backend && bun run fmt`

**Step 7: コミット**

```bash
git add backend/app/routers/ backend/app/main.py backend/app/services/search_utils.py
git commit -m "refactor: ルーターを日本語・英語・管理に分割"
```

---

### Task 3: フロントエンド hooks 統合 - useSearch<T> の作成

`useRhymeSearch.ts` と `useEnglishRhymeSearch.ts` の共通ロジックを `useSearch.ts` に統合する。

**Files:**
- Create: `frontend/src/hooks/useSearch.ts`
- Modify: `frontend/src/hooks/useRhymeSearch.ts` (useSearchを利用するラッパーに)
- Modify: `frontend/src/hooks/useEnglishRhymeSearch.ts` (useSearchを利用するラッパーに)

**Step 1: `useSearch.ts` を作成**

共通インターフェース:

```typescript
interface SearchResult {
  score: number;
}

interface SearchConfig<TResult extends SearchResult, TResponse> {
  searchFn: (reading: string, pattern: string) => Promise<TResponse>;
  extractResults: (response: TResponse) => TResult[];
  extractInput: (response: TResponse) => PatternAnalyzeResponse;
  extractPattern: (response: TResponse) => string;
  getMoraCount: (result: TResult) => number;
  sortFn: (results: TResult[], sort: SortOrder) => TResult[];
  errorPrefix?: string;
}
```

ソート・フィルター・ページネーション・エラーハンドリングの共通ロジックを実装。

**Step 2: `useRhymeSearch.ts` を `useSearch` のラッパーに書き換え**

```typescript
export function useRhymeSearch(initialOptions?: Partial<SearchOptions>) {
  const hook = useSearch<PatternRhymeResult, PatternSearchResponse>({
    searchFn: (reading, pattern) => searchRhymes({ reading, pattern, sort: "relevance", limit: 500, offset: 0 }),
    extractResults: (r) => r.results,
    extractInput: (r) => r.input,
    extractPattern: (r) => r.pattern,
    getMoraCount: (r) => r.mora_count,
    sortFn: sortJapaneseResults,
  }, initialOptions);

  // analyze は日本語固有なので残す
  const analyze = useCallback(async (reading: string): Promise<Phoneme[] | null> => {
    // ... 既存のanalyzeロジック
  }, []);

  return { ...hook, analyze };
}
```

**Step 3: `useEnglishRhymeSearch.ts` を同様に書き換え**

`analyze` を持たない分、よりシンプル。`getMoraCount` は `r.syllable_count` を返す。

**Step 4: typecheck + lint**

Run: `bun run typecheck && bun run lint:frontend`
Expected: PASS

**Step 5: 手動動作確認**

Run: `bun run dev` でフロントエンドを起動し、日本語・英語の検索が正常に動くことを確認。

**Step 6: コミット**

```bash
git add frontend/src/hooks/
git commit -m "refactor: useSearch<T>で日英検索hooksを統合"
```

---

### Task 4: page.tsx 分割

`page.tsx` (459行) を `SearchSection.tsx` と `ResultsSection.tsx` に分割する。

**Files:**
- Create: `frontend/src/components/SearchSection.tsx`
- Create: `frontend/src/components/ResultsSection.tsx`
- Modify: `frontend/src/app/page.tsx` (レイアウトのみに)
- Modify: `frontend/src/components/index.ts` (export追加)

**Step 1: `SearchSection.tsx` を作成**

以下の責務を移動:
- 言語切り替え（ja/en）チップ
- 位置チップ（suffix/prefix/exact/contains）
- 音素チップ（all/vowel/consonant/custom）
- PatternBuilder表示
- 検索ボタン

Props:
```typescript
interface SearchSectionProps {
  searchLanguage: SearchLanguage;
  position: Position;
  matchPattern: MatchPattern;
  phonemes: Phoneme[];
  currentPattern: string;
  inputValue: string | undefined;
  isLoading: boolean;
  onLanguageChange: (lang: SearchLanguage) => void;
  onPositionChange: (pos: Position) => void;
  onMatchPatternChange: (mp: MatchPattern) => void;
  onPatternChange: (pattern: string) => void;
  onSearch: () => void;
  // HiraganaInput props
  onSearchSubmit: (reading: string) => void;
  onReadingChange: (reading: string) => void;
  onValueChange: (value: string | undefined) => void;
  history: HistoryItem[];
  onHistorySelect: (word: string) => void;
  onHistoryRemove: (word: string) => void;
  onHistoryClear: () => void;
}
```

**Step 2: `ResultsSection.tsx` を作成**

以下の責務を移動:
- 結果表示の切り替え（検索結果 / お気に入り）
- 日本語・英語ResultListの分岐
- 空状態の表示

**Step 3: `page.tsx` を更新**

状態管理とコールバックは `page.tsx` に残し、UIレンダリングをSearchSection/ResultsSectionに委譲。page.tsxは200行以下になるはず。

**Step 4: components/index.ts を更新**

```typescript
export { SearchSection } from "./SearchSection";
export { ResultsSection } from "./ResultsSection";
```

**Step 5: typecheck + lint**

Run: `bun run typecheck && bun run lint:frontend`

**Step 6: 動作確認**

Run: `bun run dev` で検索・結果表示・お気に入りが正常に動くことを確認。

**Step 7: コミット**

```bash
git add frontend/src/components/SearchSection.tsx frontend/src/components/ResultsSection.tsx frontend/src/app/page.tsx frontend/src/components/index.ts
git commit -m "refactor: page.tsxをSearchSection/ResultsSectionに分割"
```

---

## Phase 2: 韻の類似度スコア

### Task 5: バックエンド - similarity_score 計算ロジック

入力語と結果語の間の類似度スコアを算出するサービスを追加。

**Files:**
- Create: `backend/app/services/similarity.py`
- Create: `backend/tests/test_similarity.py`

**Step 1: テストを書く**

```python
# backend/tests/test_similarity.py
from app.services.similarity import calculate_similarity


class TestCalculateSimilarity:
    def test_identical_vowels_high_score(self) -> None:
        """完全一致する母音パターンは高スコア"""
        score = calculate_similarity(
            input_vowels="o-u-o-u",
            input_consonants="t-k",
            result_vowels="o-u-o-u",
            result_consonants="h-k-k",
            input_mora=4,
            result_mora=4,
        )
        assert score >= 0.8

    def test_no_match_low_score(self) -> None:
        """母音が全く異なる場合は低スコア"""
        score = calculate_similarity(
            input_vowels="o-u-o-u",
            input_consonants="t-k",
            result_vowels="a-i-e",
            result_consonants="s-r-m",
            input_mora=4,
            result_mora=3,
        )
        assert score < 0.3

    def test_partial_vowel_match(self) -> None:
        """部分一致の母音パターン"""
        score = calculate_similarity(
            input_vowels="a-i-u",
            input_consonants="k-s-t",
            result_vowels="a-i-o",
            result_consonants="k-s-n",
            input_mora=3,
            result_mora=3,
        )
        assert 0.3 < score < 0.8

    def test_score_range(self) -> None:
        """スコアは0.0〜1.0の範囲"""
        score = calculate_similarity(
            input_vowels="a", input_consonants="k",
            result_vowels="a", result_consonants="k",
            input_mora=1, result_mora=1,
        )
        assert 0.0 <= score <= 1.0

    def test_suffix_vowel_weighted_higher(self) -> None:
        """末尾の母音一致は先頭より重みが大きい"""
        # 末尾一致
        score_suffix = calculate_similarity(
            input_vowels="a-i-u",
            input_consonants="k-s-t",
            result_vowels="o-i-u",
            result_consonants="n-s-t",
            input_mora=3, result_mora=3,
        )
        # 先頭一致
        score_prefix = calculate_similarity(
            input_vowels="a-i-u",
            input_consonants="k-s-t",
            result_vowels="a-i-o",
            result_consonants="k-s-n",
            input_mora=3, result_mora=3,
        )
        assert score_suffix > score_prefix
```

**Step 2: テスト実行 - 失敗を確認**

Run: `bun run test -- tests/test_similarity.py -v`
Expected: FAIL

**Step 3: 実装**

```python
# backend/app/services/similarity.py
def calculate_similarity(
    input_vowels: str,
    input_consonants: str,
    result_vowels: str,
    result_consonants: str,
    input_mora: int,
    result_mora: int,
) -> float:
    """Calculate similarity score between input and result rhyme patterns.

    Scoring weights:
    - Vowel match (suffix-weighted): 60%
    - Consonant match: 25%
    - Mora count match: 15%

    Returns: float between 0.0 and 1.0
    """
    iv = input_vowels.split("-") if input_vowels else []
    rv = result_vowels.split("-") if result_vowels else []
    ic = input_consonants.split("-") if input_consonants else []
    rc = result_consonants.split("-") if result_consonants else []

    # Vowel similarity (suffix-weighted)
    vowel_score = _weighted_sequence_match(iv, rv)

    # Consonant similarity
    consonant_score = _sequence_match(ic, rc)

    # Mora similarity
    if input_mora == 0 and result_mora == 0:
        mora_score = 1.0
    elif max(input_mora, result_mora) == 0:
        mora_score = 0.0
    else:
        mora_score = 1.0 - abs(input_mora - result_mora) / max(input_mora, result_mora)

    return vowel_score * 0.6 + consonant_score * 0.25 + mora_score * 0.15
```

**Step 4: テスト実行 - パスを確認**

Run: `bun run test -- tests/test_similarity.py -v`
Expected: PASS

**Step 5: コミット**

```bash
git add backend/app/services/similarity.py backend/tests/test_similarity.py
git commit -m "feat: 韻の類似度スコア算出ロジックを追加"
```

---

### Task 6: バックエンド - APIレスポンスに similarity_score を追加

検索レスポンスの各結果に `similarity_score` フィールドを追加。

**Files:**
- Modify: `backend/app/models/schemas.py` (PatternRhymeResult, EnglishRhymeResult に similarity_score 追加)
- Modify: `backend/app/routers/japanese.py` (similarity 計算を組み込む)
- Modify: `backend/app/routers/english.py` (同上)
- Modify: `frontend/src/types/index.ts` (型定義追加)

**Step 1: `schemas.py` にフィールド追加**

```python
class PatternRhymeResult(BaseModel):
    # ... 既存フィールド
    similarity_score: float = Field(ge=0.0, le=1.0, description="Similarity to input (0.0-1.0)")

class EnglishRhymeResult(BaseModel):
    # ... 既存フィールド
    similarity_score: float = Field(ge=0.0, le=1.0, description="Similarity to input (0.0-1.0)")
```

**Step 2: ルーターで similarity 計算を組み込む**

`japanese.py` の `search_rhymes` で、結果構築時に `calculate_similarity()` を呼び出し:

```python
from app.services.similarity import calculate_similarity

similarity = calculate_similarity(
    input_vowels=input_analysis.vowel_pattern,
    input_consonants=input_analysis.consonant_pattern,
    result_vowels=entry.vowels,
    result_consonants=entry.consonants,
    input_mora=len(input_analysis.phonemes),
    result_mora=entry.mora_count,
)
```

**Step 3: フロントエンド型定義を更新**

```typescript
// frontend/src/types/index.ts
export interface PatternRhymeResult {
  // ... 既存
  similarity_score: number;  // 追加
}

export interface EnglishRhymeResult {
  // ... 既存
  similarity_score: number;  // 追加
}
```

**Step 4: 全テスト実行**

Run: `bun run test -v`
Expected: PASS (既存テストはsimilarity_scoreフィールドの有無を検証していないため影響なし)

**Step 5: typecheck**

Run: `bun run typecheck`

**Step 6: コミット**

```bash
git add backend/app/models/schemas.py backend/app/routers/japanese.py backend/app/routers/english.py frontend/src/types/index.ts
git commit -m "feat: APIレスポンスにsimilarity_scoreフィールドを追加"
```

---

### Task 7: フロントエンド - 類似度スコアの表示

ResultCard と EnglishResultCard に類似度スコアのビジュアル表示を追加。

**Files:**
- Modify: `frontend/src/components/ResultCard.tsx`
- Modify: `frontend/src/components/EnglishResultCard.tsx`

**Step 1: ResultCard に類似度表示を追加**

既存の `score` バーの横に `similarity_score` を表示。既存の score バーを similarity_score ベースに変更:

```tsx
{/* Similarity Score */}
<div className="mt-2 flex items-center gap-1.5">
  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full ${
        result.similarity_score >= 0.8 ? "bg-emerald-500" :
        result.similarity_score >= 0.5 ? "bg-blue-500" :
        "bg-slate-300"
      }`}
      style={{ width: `${Math.round(result.similarity_score * 100)}%` }}
    />
  </div>
  <span className="text-[10px] font-medium text-slate-400 w-10 text-right">
    {Math.round(result.similarity_score * 100)}%
  </span>
</div>
```

色分け: 80%以上 = 緑, 50%以上 = 青, それ以下 = グレー

**Step 2: EnglishResultCard にも同様に追加**

**Step 3: typecheck + lint**

Run: `bun run typecheck && bun run lint:frontend`

**Step 4: 動作確認**

Run: `bun run dev` で検索して、スコアバーの色分けが正しく表示されることを確認。

**Step 5: コミット**

```bash
git add frontend/src/components/ResultCard.tsx frontend/src/components/EnglishResultCard.tsx
git commit -m "feat: ResultCardに類似度スコアのビジュアル表示を追加"
```

---

## Phase 3: 音声読み上げ

### Task 8: 音声読み上げフック - useSpeech

Web Speech API をラップするカスタムフックを作成。

**Files:**
- Create: `frontend/src/hooks/useSpeech.ts`

**Step 1: 実装**

```typescript
// frontend/src/hooks/useSpeech.ts
"use client";

import { useCallback, useRef, useState } from "react";

interface UseSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, overrideLang?: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // 再生中なら停止
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = overrideLang ?? options.lang ?? "ja-JP";
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [options.lang, options.rate, options.pitch]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  return { speak, stop, isSpeaking, isSupported };
}
```

**Step 2: typecheck**

Run: `bun run typecheck`

**Step 3: コミット**

```bash
git add frontend/src/hooks/useSpeech.ts
git commit -m "feat: Web Speech API をラップする useSpeech フックを追加"
```

---

### Task 9: ResultCard に読み上げボタンを追加

ResultCard と EnglishResultCard にスピーカーアイコンの読み上げボタンを追加。

**Files:**
- Modify: `frontend/src/components/ResultCard.tsx`
- Modify: `frontend/src/components/EnglishResultCard.tsx`

**Step 1: ResultCard を更新**

Action Buttons エリアにスピーカーボタンを追加:

```tsx
import { Volume2 } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";

// コンポーネント内
const { speak, isSpeaking, isSupported } = useSpeech({ lang: "ja-JP" });

// ボタン
{isSupported && (
  <button
    onClick={() => speak(result.reading)}
    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
      isSpeaking
        ? "text-blue-600 bg-blue-50"
        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    }`}
    title="読み上げ"
  >
    <Volume2 className="w-3.5 h-3.5" />
    <span>読む</span>
  </button>
)}
```

**Step 2: EnglishResultCard を更新**

同様にスピーカーボタン追加。`lang: "en-US"` で、`result.word` を読み上げ。

**Step 3: typecheck + lint**

Run: `bun run typecheck && bun run lint:frontend`

**Step 4: 動作確認**

ブラウザで検索結果の「読む」ボタンをクリックし、音声が再生されることを確認。

**Step 5: コミット**

```bash
git add frontend/src/components/ResultCard.tsx frontend/src/components/EnglishResultCard.tsx
git commit -m "feat: ResultCardに音声読み上げボタンを追加"
```

---

## Phase 4: 創作記録（歌詞トラッキング）

### Task 10: バックエンド - 歌詞解析API

歌詞テキストを受け取り、形態素解析で単語を抽出し、各単語の韻パターンを返すAPI。

**Files:**
- Create: `backend/app/routers/lyrics.py`
- Create: `backend/tests/test_lyrics.py`
- Modify: `backend/app/main.py` (ルーター追加)
- Modify: `backend/app/models/schemas.py` (スキーマ追加)

**Step 1: スキーマを定義**

```python
# schemas.py に追加
class LyricsAnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Lyrics text to analyze")

class LyricsWord(BaseModel):
    surface: str = Field(description="Surface form")
    reading: str = Field(description="Reading in hiragana")
    vowel_pattern: str = Field(description="Vowel pattern")
    pos: str = Field(description="Part of speech")

class LyricsAnalyzeResponse(BaseModel):
    words: list[LyricsWord] = Field(description="Extracted words with readings")
    total_words: int = Field(description="Total word count")
    unique_words: int = Field(description="Unique word count")
```

**Step 2: テストを書く**

```python
# backend/tests/test_lyrics.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestLyricsAnalyze:
    def test_analyze_simple_text(self) -> None:
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "東京の空は青い"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_words"] > 0
        assert data["unique_words"] > 0
        assert len(data["words"]) > 0

    def test_analyze_returns_vowel_patterns(self) -> None:
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "東京"},
        )
        data = response.json()
        words = data["words"]
        tokyo = next((w for w in words if w["surface"] == "東京"), None)
        assert tokyo is not None
        assert tokyo["vowel_pattern"] != ""

    def test_empty_text_rejected(self) -> None:
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": ""},
        )
        assert response.status_code == 422

    def test_filters_particles(self) -> None:
        """助詞は除外される"""
        response = client.post(
            "/api/lyrics/analyze",
            json={"text": "東京の空"},
        )
        data = response.json()
        surfaces = [w["surface"] for w in data["words"]]
        assert "の" not in surfaces
```

**Step 3: テスト実行 - 失敗を確認**

Run: `bun run test -- tests/test_lyrics.py -v`
Expected: FAIL

**Step 4: ルーターを実装**

```python
# backend/app/routers/lyrics.py
import logging
from fastapi import APIRouter, HTTPException
from app.models.schemas import LyricsAnalyzeRequest, LyricsAnalyzeResponse, LyricsWord
from app.services.tokenizer import get_tokenizer
from app.services.phoneme import analyze_hiragana, katakana_to_hiragana

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lyrics", tags=["lyrics"])

# 除外する品詞
EXCLUDED_POS = {"助詞", "助動詞", "記号", "空白", "補助記号"}

@router.post("/analyze", response_model=LyricsAnalyzeResponse)
def analyze_lyrics(request: LyricsAnalyzeRequest) -> LyricsAnalyzeResponse:
    try:
        tokenizer = get_tokenizer()
        tokens = tokenizer.tokenize(request.text)

        words: list[LyricsWord] = []
        seen: set[str] = set()

        for token in tokens:
            if token.pos in EXCLUDED_POS:
                continue
            if token.surface in seen:
                continue
            seen.add(token.surface)

            reading_hiragana = katakana_to_hiragana(token.reading)
            try:
                analysis = analyze_hiragana(reading_hiragana)
                vowel_pattern = analysis.vowels
            except Exception:
                vowel_pattern = ""

            words.append(LyricsWord(
                surface=token.surface,
                reading=reading_hiragana,
                vowel_pattern=vowel_pattern,
                pos=token.pos,
            ))

        return LyricsAnalyzeResponse(
            words=words,
            total_words=len(tokens),
            unique_words=len(words),
        )
    except Exception as e:
        logger.exception("Lyrics analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}") from e
```

**Step 5: main.py にルーター追加**

```python
from app.routers import lyrics
app.include_router(lyrics.router, prefix=settings.api_prefix)
```

**Step 6: テスト実行 - パスを確認**

Run: `bun run test -- tests/test_lyrics.py -v`
Expected: PASS

**Step 7: コミット**

```bash
git add backend/app/routers/lyrics.py backend/tests/test_lyrics.py backend/app/models/schemas.py backend/app/main.py
git commit -m "feat: 歌詞解析API (/api/lyrics/analyze) を追加"
```

---

### Task 11: フロントエンド - API クライアントと型定義の追加

歌詞解析APIのフロントエンド側クライアントと型定義を追加。

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

**Step 1: 型定義を追加**

```typescript
// frontend/src/types/index.ts に追加
export interface LyricsWord {
  surface: string;
  reading: string;
  vowel_pattern: string;
  pos: string;
}

export interface LyricsAnalyzeResponse {
  words: LyricsWord[];
  total_words: number;
  unique_words: number;
}

export interface LyricsEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  words: LyricsWord[];
}

export interface CreativeStats {
  wordUsageCount: Record<string, number>;
  rhymeUsageCount: Record<string, number>;
}
```

**Step 2: API クライアントを追加**

```typescript
// frontend/src/lib/api.ts に追加
export async function analyzeLyrics(text: string): Promise<LyricsAnalyzeResponse> {
  return fetchApi<LyricsAnalyzeResponse>("/lyrics/analyze", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
```

**Step 3: typecheck**

Run: `bun run typecheck`

**Step 4: コミット**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: 歌詞解析APIのクライアントと型定義を追加"
```

---

### Task 12: フロントエンド - useCreativeNotes フック

歌詞データのlocalStorage管理と統計計算を行うフック。

**Files:**
- Create: `frontend/src/hooks/useCreativeNotes.ts`

**Step 1: 実装**

```typescript
"use client";

import { useCallback, useMemo } from "react";
import { analyzeLyrics } from "@/lib/api";
import type { CreativeStats, LyricsEntry, LyricsWord } from "@/types";
import { createLocalStorageStore, useLocalStorageStore } from "./useLocalStorage";

const STORAGE_KEY = "creative-notes";
const MAX_ENTRIES = 100;
const EMPTY_ENTRIES: LyricsEntry[] = [];

function isValidEntry(item: unknown): item is LyricsEntry {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.content === "string" &&
    typeof obj.createdAt === "string" &&
    Array.isArray(obj.words)
  );
}

const notesStore = createLocalStorageStore<LyricsEntry[]>(
  STORAGE_KEY,
  EMPTY_ENTRIES,
  isValidEntry,
);

export function useCreativeNotes() {
  const entries = useLocalStorageStore(notesStore);

  const addEntry = useCallback(async (title: string, content: string) => {
    const current = notesStore.getSnapshot();
    if (current.length >= MAX_ENTRIES) return null;

    const response = await analyzeLyrics(content);

    const entry: LyricsEntry = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
      words: response.words,
    };

    notesStore.setData([entry, ...current]);
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    const current = notesStore.getSnapshot();
    notesStore.setData(current.filter((e) => e.id !== id));
  }, []);

  const stats: CreativeStats = useMemo(() => {
    const wordUsageCount: Record<string, number> = {};
    const rhymeUsageCount: Record<string, number> = {};

    for (const entry of entries) {
      for (const word of entry.words) {
        wordUsageCount[word.surface] = (wordUsageCount[word.surface] ?? 0) + 1;
        if (word.vowel_pattern) {
          rhymeUsageCount[word.vowel_pattern] = (rhymeUsageCount[word.vowel_pattern] ?? 0) + 1;
        }
      }
    }

    return { wordUsageCount, rhymeUsageCount };
  }, [entries]);

  const getWordUsageCount = useCallback(
    (word: string) => stats.wordUsageCount[word] ?? 0,
    [stats],
  );

  const clearAll = useCallback(() => {
    notesStore.clear();
  }, []);

  return {
    entries,
    stats,
    addEntry,
    removeEntry,
    getWordUsageCount,
    clearAll,
  };
}
```

**Step 2: typecheck**

Run: `bun run typecheck`

**Step 3: コミット**

```bash
git add frontend/src/hooks/useCreativeNotes.ts
git commit -m "feat: 創作記録管理フック useCreativeNotes を追加"
```

---

### Task 13: フロントエンド - 創作ノートUI

歌詞入力・一覧・統計ダッシュボードのコンポーネントを作成。

**Files:**
- Create: `frontend/src/components/CreativeNotes.tsx`
- Modify: `frontend/src/components/index.ts`

**Step 1: `CreativeNotes.tsx` を作成**

主要セクション:
1. 歌詞入力フォーム（タイトル + テキストエリア + 保存ボタン）
2. よく使う韻 TOP10 リスト
3. 保存済み歌詞一覧（タイトル、日付、抽出語数）
4. 個別エントリの展開表示（抽出語一覧）

```typescript
interface CreativeNotesProps {
  entries: LyricsEntry[];
  stats: CreativeStats;
  onAdd: (title: string, content: string) => Promise<LyricsEntry | null>;
  onRemove: (id: string) => void;
  onClear: () => void;
}
```

**Step 2: components/index.ts を更新**

```typescript
export { CreativeNotes } from "./CreativeNotes";
```

**Step 3: typecheck + lint**

Run: `bun run typecheck && bun run lint:frontend`

**Step 4: コミット**

```bash
git add frontend/src/components/CreativeNotes.tsx frontend/src/components/index.ts
git commit -m "feat: 創作ノートUIコンポーネントを追加"
```

---

### Task 14: page.tsx に創作ノートタブを統合

メインページに「検索」「お気に入り」に加えて「創作ノート」タブを追加。

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Step 1: page.tsx を更新**

`ResultTab` 型に `"notes"` を追加:
```typescript
type ResultTab = "search" | "favorites" | "notes";
```

ヘッダーに創作ノートアイコンボタンを追加（Notebook アイコンなど）。

ResultsSection（または直接page.tsx）に `CreativeNotes` コンポーネントを条件表示:

```tsx
{resultTab === "notes" && (
  <CreativeNotes
    entries={creativeNotes.entries}
    stats={creativeNotes.stats}
    onAdd={creativeNotes.addEntry}
    onRemove={creativeNotes.removeEntry}
    onClear={creativeNotes.clearAll}
  />
)}
```

**Step 2: ResultCard に使用回数表示を追加**

`page.tsx` から `getWordUsageCount` を ResultCard に渡し、使用済みの場合にバッジ表示:

```tsx
// ResultCard props に追加
usageCount?: number;

// 表示（usageCount > 0 の場合）
{usageCount > 0 && (
  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-600 rounded">
    {usageCount}回使用
  </span>
)}
```

**Step 3: typecheck + lint**

Run: `bun run typecheck && bun run lint:frontend`

**Step 4: 動作確認**

1. 創作ノートタブを開く
2. 歌詞テキストをペーストして保存
3. 抽出された単語一覧を確認
4. よく使う韻TOP10を確認
5. 韻検索に戻り、使用回数バッジが表示されることを確認

**Step 5: コミット**

```bash
git add frontend/src/app/page.tsx frontend/src/components/ResultCard.tsx frontend/src/components/EnglishResultCard.tsx frontend/src/components/ResultsSection.tsx
git commit -m "feat: 創作ノートタブを統合し、使用回数バッジを追加"
```

---

### Task 15: 全体確認とドキュメント更新

全機能の統合テスト・lint・型チェックを実行し、ドキュメントを更新。

**Files:**
- Modify: `README.md` (新機能の説明追加)
- Modify: `CLAUDE.md` (新APIエンドポイント追加)

**Step 1: 全テスト実行**

Run: `bun run check`
Expected: typecheck + lint + test ALL PASS

**Step 2: CLAUDE.md を更新**

APIエンドポイント表に `/lyrics/analyze` を追加。

**Step 3: コミット**

```bash
git add README.md CLAUDE.md
git commit -m "docs: 新機能のドキュメントを更新"
```

---

## タスク依存関係

```
Task 1 → Task 2 (ルーター分割は段階的に)
Task 3 (hooks統合は独立)
Task 4 (page.tsx分割は Task 3 の後)
Task 5 → Task 6 → Task 7 (類似度スコアは段階的に)
Task 8 → Task 9 (音声は独立)
Task 10 → Task 11 → Task 12 → Task 13 → Task 14 (創作記録は段階的に)
Task 15 (最後に全体確認)
```

## 並列実行可能なタスク

- Task 1-2 (バックエンド) と Task 3-4 (フロントエンド) は並列可能
- Task 5-7 (類似度) と Task 8-9 (音声) は並列可能
- Task 10 (歌詞API) と Task 8-9 (音声) は並列可能
