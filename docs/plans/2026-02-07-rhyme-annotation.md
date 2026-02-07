# 韻マーキング機能 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 歌詞テキスト上で範囲選択し、色分けで韻グループをマーキングできる機能。自動母音パターン解析付き。

**Architecture:** 現在の自動解析ベースの CreativeNotes を、手動マーキング方式に置き換える。テキスト選択 → 色でグルーピング → 母音パターン自動表示。バックエンドに軽量なフォネーム解析エンドポイントを追加し、フロントエンドの CreativeNotes コンポーネントとフックを全面的に書き換える。

**Tech Stack:** FastAPI, SudachiPy, Next.js, TypeScript, Tailwind CSS, localStorage

---

## Task 1: Backend - テキスト → 母音パターン変換エンドポイント

選択テキストの母音パターンを取得する軽量エンドポイント。既存の `/lyrics/analyze` は単語フィルタリングが入るため、アノテーション用に全文字の母音を返す新エンドポイントが必要。

**Files:**
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/routers/lyrics.py`
- Modify: `backend/tests/test_lyrics.py`

**Step 1: テストを書く**

`backend/tests/test_lyrics.py` に追加:

```python
class TestLyricsPhoneme:
    def test_phoneme_returns_vowel_pattern(self) -> None:
        response = client.post(
            "/api/lyrics/phoneme",
            json={"text": "東京"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reading"] != ""
        assert data["vowel_pattern"] != ""

    def test_phoneme_with_phrase(self) -> None:
        response = client.post(
            "/api/lyrics/phoneme",
            json={"text": "待ってました"},
        )
        data = response.json()
        # 全文字の母音パターンが返る（フィルタリングなし）
        assert "-" in data["vowel_pattern"]

    def test_phoneme_empty_text(self) -> None:
        response = client.post(
            "/api/lyrics/phoneme",
            json={"text": ""},
        )
        assert response.status_code == 422
```

**Step 2: テストが失敗することを確認**

```bash
bun run test
```
Expected: FAIL (endpoint does not exist)

**Step 3: スキーマを追加**

`backend/app/models/schemas.py` に追加:

```python
class LyricsPhonemeResponse(BaseModel):
    reading: str = Field(description="Hiragana reading")
    vowel_pattern: str = Field(description="Combined vowel pattern")
```

**Step 4: エンドポイントを実装**

`backend/app/routers/lyrics.py` に追加:

```python
@router.post("/phoneme", response_model=LyricsPhonemeResponse)
def analyze_phoneme(request: LyricsAnalyzeRequest) -> LyricsPhonemeResponse:
    """Analyze text and return combined vowel pattern without word filtering."""
    try:
        tokenizer = get_tokenizer()
        tokens = tokenizer.tokenize(request.text, split_mode=SplitMode.B)

        vowel_parts: list[str] = []
        readings: list[str] = []

        for token in tokens:
            reading_hiragana = katakana_to_hiragana(token.reading)
            readings.append(reading_hiragana)
            try:
                analysis = analyze_hiragana(reading_hiragana)
                if analysis.vowels:
                    vowel_parts.append(analysis.vowels)
            except Exception:
                pass

        return LyricsPhonemeResponse(
            reading="".join(readings),
            vowel_pattern="-".join(vowel_parts) if vowel_parts else "",
        )
    except Exception as e:
        logger.exception("Phoneme analysis failed")
        raise HTTPException(status_code=500, detail="Analysis failed") from e
```

`schemas.py` の import を `lyrics.py` に追加:
```python
from app.models.schemas import (
    LyricsAnalyzeRequest,
    LyricsAnalyzeResponse,
    LyricsPhonemeResponse,  # 追加
    LyricsRhymeGroup,
    LyricsWord,
)
```

**Step 5: テストを実行して通ることを確認**

```bash
bun run test
```
Expected: ALL PASS

**Step 6: コミット**

```bash
git add backend/app/models/schemas.py backend/app/routers/lyrics.py backend/tests/test_lyrics.py
git commit -m "feat: テキスト→母音パターン変換エンドポイントを追加"
```

---

## Task 2: Frontend - 型定義の更新

アノテーションベースの新しいデータモデルに型を更新する。

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

**Step 1: 型定義を更新**

`frontend/src/types/index.ts` の Lyrics 関連型を更新:

```typescript
// 既存の LyricsWord, LyricsRhymeGroup, LyricsAnalyzeResponse はそのまま残す
// （/lyrics/analyze エンドポイントのレスポンス型として使用中）

// 新規追加
export interface RhymeAnnotation {
  id: string;
  color: string;
  startOffset: number;
  endOffset: number;
  text: string;
  vowelPattern: string;
}

export interface LyricsPhonemeResponse {
  reading: string;
  vowel_pattern: string;
}

// LyricsEntry を更新（words, rhyme_groups → annotations）
export interface LyricsEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  annotations: RhymeAnnotation[];
}

// CreativeStats を更新
export interface CreativeStats {
  rhymePatternCount: Record<string, number>;
}
```

**Step 2: API クライアントに phoneme 関数を追加**

`frontend/src/lib/api.ts` に追加:

```typescript
export async function analyzePhoneme(
  text: string,
): Promise<LyricsPhonemeResponse> {
  return fetchApi<LyricsPhonemeResponse>("/lyrics/phoneme", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
```

import に `LyricsPhonemeResponse` を追加。

**Step 3: コミット**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: アノテーション型定義とphoneme APIクライアントを追加"
```

---

## Task 3: Frontend - useCreativeNotes フックの書き換え

アノテーションの CRUD と統計計算をサポートするフックに書き換える。

**Files:**
- Modify: `frontend/src/hooks/useCreativeNotes.ts`

**Step 1: フックを書き換え**

```typescript
"use client";

import { useCallback, useMemo } from "react";

import { analyzePhoneme } from "@/lib/api";
import type { CreativeStats, LyricsEntry, RhymeAnnotation } from "@/types";

import { createLocalStorageStore, useLocalStorageStore } from "./useLocalStorage";

const STORAGE_KEY = "creative-notes-v2";
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
    Array.isArray(obj.annotations)
  );
}

const notesStore = createLocalStorageStore<LyricsEntry[]>(
  STORAGE_KEY,
  EMPTY_ENTRIES,
  isValidEntry,
);

export function useCreativeNotes() {
  const entries = useLocalStorageStore(notesStore);

  const addEntry = useCallback((title: string, content: string) => {
    const current = notesStore.getSnapshot();
    if (current.length >= MAX_ENTRIES) return null;

    const entry: LyricsEntry = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
      annotations: [],
    };

    notesStore.setData([entry, ...current]);
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    const current = notesStore.getSnapshot();
    notesStore.setData(current.filter((e) => e.id !== id));
  }, []);

  const addAnnotation = useCallback(
    async (
      entryId: string,
      color: string,
      startOffset: number,
      endOffset: number,
      text: string,
    ): Promise<RhymeAnnotation | null> => {
      const response = await analyzePhoneme(text);

      const annotation: RhymeAnnotation = {
        id: crypto.randomUUID(),
        color,
        startOffset,
        endOffset,
        text,
        vowelPattern: response.vowel_pattern,
      };

      const current = notesStore.getSnapshot();
      notesStore.setData(
        current.map((e) =>
          e.id === entryId
            ? { ...e, annotations: [...e.annotations, annotation] }
            : e,
        ),
      );

      return annotation;
    },
    [],
  );

  const removeAnnotation = useCallback(
    (entryId: string, annotationId: string) => {
      const current = notesStore.getSnapshot();
      notesStore.setData(
        current.map((e) =>
          e.id === entryId
            ? {
                ...e,
                annotations: e.annotations.filter((a) => a.id !== annotationId),
              }
            : e,
        ),
      );
    },
    [],
  );

  const stats: CreativeStats = useMemo(() => {
    const rhymePatternCount: Record<string, number> = {};

    for (const entry of entries) {
      for (const annotation of entry.annotations) {
        if (annotation.vowelPattern) {
          rhymePatternCount[annotation.vowelPattern] =
            (rhymePatternCount[annotation.vowelPattern] ?? 0) + 1;
        }
      }
    }

    return { rhymePatternCount };
  }, [entries]);

  const clearAll = useCallback(() => {
    notesStore.clear();
  }, []);

  return {
    entries,
    stats,
    addEntry,
    removeEntry,
    addAnnotation,
    removeAnnotation,
    clearAll,
  };
}
```

**注意点:**
- `STORAGE_KEY` を `"creative-notes-v2"` に変更（旧データとの競合を防ぐ）
- `addEntry` は同期化（API呼び出し不要に）
- `addAnnotation` は非同期（phoneme API を呼ぶ）
- `stats` はアノテーションの母音パターンから集計

**Step 2: コミット**

```bash
git add frontend/src/hooks/useCreativeNotes.ts
git commit -m "refactor: useCreativeNotes をアノテーションベースに書き換え"
```

---

## Task 4: Frontend - AnnotatedLyrics コンポーネント

テキストのハイライト表示、テキスト選択、カラーパレットを担う核心コンポーネント。

**Files:**
- Create: `frontend/src/components/AnnotatedLyrics.tsx`

**Step 1: カラー定義とセグメント分割ロジック**

```typescript
"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import type { RhymeAnnotation } from "@/types";

export const RHYME_COLORS = [
  { id: "red", bg: "bg-red-100", text: "text-red-700", ring: "ring-red-400", dot: "bg-red-400" },
  { id: "blue", bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-400", dot: "bg-blue-400" },
  { id: "green", bg: "bg-green-100", text: "text-green-700", ring: "ring-green-400", dot: "bg-green-400" },
  { id: "amber", bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-400", dot: "bg-amber-400" },
  { id: "purple", bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-400", dot: "bg-purple-400" },
  { id: "pink", bg: "bg-pink-100", text: "text-pink-700", ring: "ring-pink-400", dot: "bg-pink-400" },
] as const;

type RhymeColor = (typeof RHYME_COLORS)[number];

function getColorConfig(colorId: string): RhymeColor {
  return RHYME_COLORS.find((c) => c.id === colorId) ?? RHYME_COLORS[0];
}

interface Segment {
  start: number;
  end: number;
  text: string;
  annotation?: RhymeAnnotation;
}

function buildSegments(
  content: string,
  annotations: RhymeAnnotation[],
): Segment[] {
  if (annotations.length === 0) {
    return [{ start: 0, end: content.length, text: content }];
  }

  const sorted = [...annotations].sort((a, b) => a.startOffset - b.startOffset);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const ann of sorted) {
    if (ann.startOffset > cursor) {
      segments.push({
        start: cursor,
        end: ann.startOffset,
        text: content.slice(cursor, ann.startOffset),
      });
    }
    segments.push({
      start: ann.startOffset,
      end: ann.endOffset,
      text: content.slice(ann.startOffset, ann.endOffset),
      annotation: ann,
    });
    cursor = ann.endOffset;
  }

  if (cursor < content.length) {
    segments.push({
      start: cursor,
      end: content.length,
      text: content.slice(cursor),
    });
  }

  return segments;
}
```

**Step 2: コンポーネント本体**

```typescript
interface AnnotatedLyricsProps {
  content: string;
  annotations: RhymeAnnotation[];
  onAddAnnotation: (
    color: string,
    startOffset: number,
    endOffset: number,
    text: string,
  ) => Promise<RhymeAnnotation | null>;
  onRemoveAnnotation: (annotationId: string) => void;
}

export function AnnotatedLyrics({
  content,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
}: AnnotatedLyricsProps) {
  const [selectedColor, setSelectedColor] = useState<string>(RHYME_COLORS[0].id);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const segments = buildSegments(content, annotations);

  const hasOverlap = useCallback(
    (start: number, end: number) =>
      annotations.some((a) => start < a.endOffset && end > a.startOffset),
    [annotations],
  );

  const handleMouseUp = useCallback(async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || isAnalyzing) return;

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // テキストノードの親 span から data-offset を取得
    const startSpan =
      startContainer.nodeType === Node.TEXT_NODE
        ? startContainer.parentElement
        : (startContainer as HTMLElement);
    const endSpan =
      endContainer.nodeType === Node.TEXT_NODE
        ? endContainer.parentElement
        : (endContainer as HTMLElement);

    if (!startSpan?.dataset.offset || !endSpan?.dataset.offset) return;

    const startOffset =
      parseInt(startSpan.dataset.offset, 10) + range.startOffset;
    const endOffset = parseInt(endSpan.dataset.offset, 10) + range.endOffset;

    if (startOffset >= endOffset) return;
    if (hasOverlap(startOffset, endOffset)) {
      selection.removeAllRanges();
      return;
    }

    const selectedText = content.slice(startOffset, endOffset);

    setIsAnalyzing(true);
    try {
      await onAddAnnotation(selectedColor, startOffset, endOffset, selectedText);
    } finally {
      setIsAnalyzing(false);
      selection.removeAllRanges();
    }
  }, [content, selectedColor, isAnalyzing, hasOverlap, onAddAnnotation]);

  return (
    <div className="space-y-3">
      {/* カラーパレット */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">韻の色:</span>
        {RHYME_COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => setSelectedColor(color.id)}
            className={`w-5 h-5 rounded-full ${color.dot} transition-all ${
              selectedColor === color.id
                ? "ring-2 ring-offset-1 " + color.ring
                : "opacity-50 hover:opacity-75"
            }`}
            title={color.id}
          />
        ))}
        {isAnalyzing && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
        )}
      </div>

      {/* 歌詞テキスト（マーキング対象） */}
      <div
        ref={contentRef}
        onMouseUp={handleMouseUp}
        className="text-sm leading-relaxed whitespace-pre-wrap select-text cursor-text font-sans text-slate-700"
      >
        {segments.map((seg) => {
          if (seg.annotation) {
            const color = getColorConfig(seg.annotation.color);
            return (
              <span
                key={seg.annotation.id}
                data-offset={seg.start}
                onClick={() =>
                  setSelectedAnnotation(
                    selectedAnnotation === seg.annotation!.id
                      ? null
                      : seg.annotation!.id,
                  )
                }
                className={`${color.bg} ${color.text} rounded-sm px-0.5 cursor-pointer
                  ${selectedAnnotation === seg.annotation.id ? "ring-1 " + color.ring : ""}`}
              >
                {seg.text}
              </span>
            );
          }
          return (
            <span key={`plain-${seg.start}`} data-offset={seg.start}>
              {seg.text}
            </span>
          );
        })}
      </div>

      {/* 選択中アノテーションの詳細 */}
      {selectedAnnotation && (() => {
        const ann = annotations.find((a) => a.id === selectedAnnotation);
        if (!ann) return null;
        const color = getColorConfig(ann.color);
        return (
          <div className={`flex items-center gap-2 text-xs ${color.bg} ${color.text} px-2 py-1.5 rounded-lg`}>
            <span className="font-medium">{ann.text}</span>
            <span className="font-mono text-[10px] opacity-75">
              {ann.vowelPattern}
            </span>
            <button
              onClick={() => {
                onRemoveAnnotation(ann.id);
                setSelectedAnnotation(null);
              }}
              className="ml-auto p-0.5 hover:bg-white/50 rounded transition-colors"
              title="削除"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })()}

      {/* 韻グループサマリー */}
      {annotations.length > 0 && (
        <RhymeGroupSummary annotations={annotations} />
      )}
    </div>
  );
}
```

**Step 3: 韻グループサマリーコンポーネント**

```typescript
function RhymeGroupSummary({
  annotations,
}: {
  annotations: RhymeAnnotation[];
}) {
  // 色でグルーピング
  const groups = new Map<string, RhymeAnnotation[]>();
  for (const ann of annotations) {
    const group = groups.get(ann.color) ?? [];
    group.push(ann);
    groups.set(ann.color, group);
  }

  // 2つ以上のアノテーションがある色のみ表示
  const rhymeGroups = [...groups.entries()].filter(
    ([, anns]) => anns.length >= 2,
  );

  if (rhymeGroups.length === 0) return null;

  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="text-xs text-slate-400 mb-2">韻グループ</p>
      <div className="space-y-1.5">
        {rhymeGroups.map(([colorId, anns]) => {
          const color = getColorConfig(colorId);
          return (
            <div key={colorId} className="flex items-start gap-2 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${color.dot} mt-0.5 shrink-0`} />
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {anns.map((ann) => (
                  <span key={ann.id} className="text-slate-600">
                    {ann.text}
                    <span className="font-mono text-[10px] text-slate-400 ml-0.5">
                      ({ann.vowelPattern})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 4: コミット**

```bash
git add frontend/src/components/AnnotatedLyrics.tsx
git commit -m "feat: AnnotatedLyrics コンポーネントを追加"
```

---

## Task 5: Frontend - CreativeNotes の書き換え

既存の自動解析UIを、アノテーションベースのUIに置き換える。

**Files:**
- Modify: `frontend/src/components/CreativeNotes.tsx`

**Step 1: コンポーネントを書き換え**

Props インターフェースを更新:

```typescript
interface CreativeNotesProps {
  entries: LyricsEntry[];
  stats: CreativeStats;
  onAdd: (title: string, content: string) => LyricsEntry | null;
  onRemove: (id: string) => void;
  onAddAnnotation: (
    entryId: string,
    color: string,
    startOffset: number,
    endOffset: number,
    text: string,
  ) => Promise<RhymeAnnotation | null>;
  onRemoveAnnotation: (entryId: string, annotationId: string) => void;
  onClear: () => void;
}
```

主な変更点:
- `onAdd` は同期に（API呼び出し不要）
- `onAddAnnotation` / `onRemoveAnnotation` を追加
- `isSaving` / `saveError` 関連のローディング状態を削除
- 展開時に `AnnotatedLyrics` コンポーネントを表示
- 旧 `words` / `rhyme_groups` の表示コードを削除
- 統計表示を `rhymePatternCount` ベースに変更

**Step 2: コミット**

```bash
git add frontend/src/components/CreativeNotes.tsx
git commit -m "refactor: CreativeNotes をアノテーションUIに書き換え"
```

---

## Task 6: Frontend - page.tsx の統合

フックとコンポーネントを接続し、不要になった prop やインポートを整理する。

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Step 1: page.tsx を更新**

- `useCreativeNotes` の返り値から新しい関数を受け取る
- `CreativeNotes` に新しい props を渡す
- `getWordUsageCount` 関連のコードを削除（アノテーションベースでは不要）
- `analyzeLyrics` のインポートが不要なら削除

**Step 2: コミット**

```bash
git add frontend/src/app/page.tsx
git commit -m "refactor: page.tsx をアノテーション対応に更新"
```

---

## Task 7: 型チェック・lint・テスト

全体の整合性を確認する。

**Files:**
- 全体

**Step 1: 型チェックと lint を実行**

```bash
bun run check
```

**Step 2: エラーがあれば修正**

- 未使用の型・インポートを削除
- `analyzeLyrics` API 関数が他で使われていなければ削除可
- 旧 `CreativeStats` の `wordUsageCount` / `rhymeUsageCount` を使用している箇所を更新

**Step 3: バックエンドテストを実行**

```bash
bun run test
```

**Step 4: 最終コミット**

```bash
git add -A
git commit -m "chore: 型チェック・lint エラーを修正"
```

---

## 補足: 設計判断

### テキスト選択のオフセット計算
- 各テキストセグメントの `<span>` に `data-offset` 属性を付与
- `window.getSelection()` の Range からオフセットを逆算
- 既存アノテーションとの重複は拒否（重なるハイライトは複雑になるため）

### 色の数
- 6色（red, blue, green, amber, purple, pink）
- Tailwind の標準カラーパレットを使用
- 拡張は容易（配列に追加するだけ）

### localStorage マイグレーション
- キーを `"creative-notes-v2"` に変更し、旧データとの競合を回避
- 旧データ `"creative-notes"` は放置（ユーザーが気にならない程度のサイズ）

### 保存フロー
- 歌詞の保存時にはAPI呼び出し不要（テキストをそのまま保存）
- API呼び出しはアノテーション追加時のみ（選択テキストの母音パターン取得）
