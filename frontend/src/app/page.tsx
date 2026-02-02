"use client";

import { Clock, Heart, RefreshCw, Search } from "lucide-react";
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
import type { PatternRhymeResult, Phoneme } from "@/types";

type Dropdown = "history" | "favorites" | null;
type RubyFormat = "katakana" | "half-katakana" | "hiragana";

export default function Home() {
  const [openDropdown, setOpenDropdown] = useState<Dropdown>(null);
  const [currentPattern, setCurrentPattern] = useState("");
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [rubyFormat, setRubyFormat] = useState<RubyFormat>("katakana");
  const [inputValue, setInputValue] = useState<string | undefined>(undefined);

  const {
    input,
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
      setOpenDropdown(null);
    },
    [addToHistory, search, currentPattern]
  );

  const handleHistorySelect = useCallback(
    async (word: string) => {
      setInputValue(word);
      const result = await analyze(word);
      if (result) {
        setPhonemes(result);
        const patternParts = result.map(
          (p) => (p.consonant || "") + p.vowel
        );
        const newPattern = patternParts.join("") + "*";
        setCurrentPattern(newPattern);
        search(word, newPattern);
        setOpenDropdown(null);
      }
    },
    [analyze, search]
  );

  const handleWordClick = useCallback(
    async (word: string, reading: string) => {
      setInputValue(reading);
      const result = await analyze(reading);
      if (result) {
        setPhonemes(result);
        const patternParts = result.map(
          (p) => (p.consonant || "") + p.vowel
        );
        const newPattern = patternParts.join("") + "*";
        setCurrentPattern(newPattern);
        addToHistory(reading);
        search(reading, newPattern);
      }
    },
    [analyze, search, addToHistory]
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
          <div className="flex items-center gap-2">
            {updateMessage && (
              <span className="text-sm text-slate-500">{updateMessage}</span>
            )}
            <button
              onClick={handleUpdateIndex}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="辞書を更新"
            >
              <RefreshCw
                className={`w-4 h-4 ${isUpdating ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {isUpdating ? "更新中..." : "辞書を更新"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <HiraganaInput
            onSearch={handleSearch}
            onReadingChange={handleReadingChange}
            isLoading={isLoading}
            value={inputValue}
            onValueChange={setInputValue}
          />

          {/* History & Favorites Buttons */}
          {openDropdown && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpenDropdown(null)}
            />
          )}
          <div className="flex gap-2 mt-3">
            <div className="relative">
              <button
                onClick={() =>
                  setOpenDropdown(openDropdown === "history" ? null : "history")
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  openDropdown === "history"
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-4 h-4" />
                履歴
                {history.length > 0 && (
                  <span className="text-xs text-slate-400">
                    ({history.length})
                  </span>
                )}
              </button>
              {openDropdown === "history" && (
                <div className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-auto bg-white rounded-xl shadow-lg border border-slate-200 z-20">
                  <div className="p-4">
                    <HistoryPanel
                      history={history}
                      onSelect={handleHistorySelect}
                      onRemove={removeFromHistory}
                      onClear={clearHistory}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === "favorites" ? null : "favorites"
                  )
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  openDropdown === "favorites"
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Heart className="w-4 h-4" />
                お気に入り
                {favorites.length > 0 && (
                  <span className="text-xs text-slate-400">
                    ({favorites.length})
                  </span>
                )}
              </button>
              {openDropdown === "favorites" && (
                <div className="absolute top-full left-0 mt-1 w-96 max-h-96 overflow-auto bg-white rounded-xl shadow-lg border border-slate-200 z-20">
                  <div className="p-4">
                    <FavoritesPanel
                      favorites={favorites}
                      onRemove={removeFavorite}
                      onExport={exportFavorites}
                      onClear={clearFavorites}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

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

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[300px]">
          {hasResults ? (
            <ResultList
              input={input}
              results={results}
              total={total}
              page={page}
              totalPages={totalPages}
              isLoading={isLoading}
              error={error}
              rubyFormat={rubyFormat}
              sortOrder={searchOptions.sort}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onPageChange={goToPage}
              onRubyFormatChange={setRubyFormat}
              onSortChange={(sort) => updateOptions({ sort })}
              onWordClick={handleWordClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">韻を探してみよう</p>
              <p className="text-sm mt-1">
                上の検索ボックスにひらがなを入力してください
              </p>
            </div>
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
