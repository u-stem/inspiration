"use client";

import {
  Clock,
  Heart,
  RefreshCw,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import {
  FavoritesPanel,
  HistoryPanel,
  HiraganaInput,
  PatternBuilder,
  ResultList,
} from "@/components";
import { useFavorites } from "@/hooks/useFavorites";
import { useHistory } from "@/hooks/useHistory";
import { useRhymeSearch } from "@/hooks/useRhymeSearch";
import { updateIndex } from "@/lib/api";
import type { PatternRhymeResult, Phoneme, SortOrder } from "@/types";

type Tab = "results" | "history" | "favorites";

const SORTS: { value: SortOrder; label: string }[] = [
  { value: "relevance", label: "関連度順" },
  { value: "reading_asc", label: "五十音順（昇順）" },
  { value: "reading_desc", label: "五十音順（降順）" },
  { value: "mora_asc", label: "モーラ数（短い順）" },
  { value: "mora_desc", label: "モーラ数（長い順）" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("results");
  const [currentPattern, setCurrentPattern] = useState("");
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const {
    input,
    pattern,
    results,
    total,
    page,
    totalPages,
    isLoading,
    error,
    searchOptions,
    analyze,
    search,
    goToPage,
    updateOptions,
  } = useRhymeSearch();

  const { history, addToHistory, removeFromHistory, clearHistory } =
    useHistory();

  const {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    exportFavorites,
    clearFavorites,
  } = useFavorites();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReadingChange = useCallback(
    (reading: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (reading.length === 0) {
        setPhonemes([]);
        return;
      }

      debounceTimerRef.current = setTimeout(async () => {
        const result = await analyze(reading);
        if (result) {
          setPhonemes(result);
        }
      }, 300);
    },
    [analyze]
  );

  const handlePatternChange = useCallback((newPattern: string) => {
    setCurrentPattern(newPattern);
  }, []);

  const handleSearch = useCallback(
    (reading: string) => {
      if (!reading.trim() || !currentPattern.trim()) {
        return;
      }
      addToHistory(reading);
      search(reading, currentPattern);
      setActiveTab("results");
    },
    [addToHistory, search, currentPattern]
  );

  const handleHistorySelect = useCallback(
    async (word: string) => {
      const result = await analyze(word);
      if (result) {
        setPhonemes(result);
        // 末尾一致検索用のデフォルトパターンを生成
        const patternParts = result.map(
          (p) => (p.consonant || "") + p.vowel
        );
        const newPattern = patternParts.join("") + "*";
        setCurrentPattern(newPattern);
        search(word, newPattern);
        setActiveTab("results");
      }
    },
    [analyze, search]
  );

  const handleToggleFavorite = useCallback(
    (result: PatternRhymeResult) => {
      if (isFavorite(result.word)) {
        removeFavorite(result.word);
      } else {
        addFavorite({
          word: result.word,
          reading: result.reading,
          vowels: result.vowel_pattern,
        });
      }
    },
    [addFavorite, isFavorite, removeFavorite]
  );

  const handleUpdateIndex = useCallback(async () => {
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
      const result = await updateIndex(false);
      setUpdateMessage(result.message);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "更新に失敗しました";
      setUpdateMessage(`更新に失敗: ${errorMessage}`);
      console.error("Index update failed:", err);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const hasResults = input !== null || results.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">韻スピレーション</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-expanded={showSettings}
            aria-label="設定を開く"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t border-slate-200 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-slate-700">設定</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                  aria-label="設定を閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  辞書管理
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUpdateIndex}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white text-slate-600 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isUpdating ? "animate-spin" : ""}`}
                    />
                    {isUpdating ? "更新中..." : "辞書を更新"}
                  </button>
                  {updateMessage && (
                    <span className="text-sm text-slate-500">
                      {updateMessage}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  新しい単語をインデックスに追加します
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <HiraganaInput
            onSearch={handleSearch}
            onReadingChange={handleReadingChange}
            isLoading={isLoading}
          />

          {/* Pattern Builder */}
          {phonemes.length > 0 && (
            <div className="mt-6">
              <PatternBuilder
                phonemes={phonemes}
                preset="custom"
                onPatternChange={handlePatternChange}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "results"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            検索結果
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "history"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            履歴
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "favorites"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            お気に入り
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[300px]">
          {activeTab === "results" && (
            <>
              {hasResults ? (
                <>
                  {/* Sort Selection */}
                  <div className="flex items-center justify-end mb-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-500">並び順:</label>
                      <select
                        value={searchOptions.sort}
                        onChange={(e) =>
                          updateOptions({ sort: e.target.value as SortOrder })
                        }
                        className="px-3 py-1.5 rounded-md text-sm bg-slate-100 text-slate-700 border-0 focus:ring-2 focus:ring-blue-500"
                      >
                        {SORTS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <ResultList
                    input={input}
                    pattern={pattern}
                    results={results}
                    total={total}
                    page={page}
                    totalPages={totalPages}
                    isLoading={isLoading}
                    error={error}
                    isFavorite={isFavorite}
                    onToggleFavorite={handleToggleFavorite}
                    onPageChange={goToPage}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Search className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">韻を探してみよう</p>
                  <p className="text-sm mt-1">
                    上の検索ボックスにひらがなを入力してください
                  </p>
                </div>
              )}
            </>
          )}
          {activeTab === "history" && (
            <HistoryPanel
              history={history}
              onSelect={handleHistorySelect}
              onRemove={removeFromHistory}
              onClear={clearHistory}
            />
          )}
          {activeTab === "favorites" && (
            <FavoritesPanel
              favorites={favorites}
              onRemove={removeFavorite}
              onExport={exportFavorites}
              onClear={clearFavorites}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
          韻スピレーション - 日本語韻生成ツール
        </div>
      </footer>
    </div>
  );
}
