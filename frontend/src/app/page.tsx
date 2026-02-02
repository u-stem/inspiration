"use client";

import { Heart, Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import {
  FavoritesPanel,
  HiraganaInput,
  PatternBuilder,
  ResultList,
} from "@/components";
import { useEnglishRhymeSearch } from "@/hooks/useEnglishRhymeSearch";
import { useFavorites } from "@/hooks/useFavorites";
import { useHistory } from "@/hooks/useHistory";
import { useRhymeSearch } from "@/hooks/useRhymeSearch";
import type { EnglishRhymeResult, PatternRhymeResult, Phoneme, SearchLanguage } from "@/types";

type RubyFormat = "katakana" | "half-katakana" | "hiragana";
type ResultTab = "search" | "favorites";
type Position = "prefix" | "suffix" | "contains" | "exact";

const POSITIONS: { value: Position; label: string }[] = [
  { value: "suffix", label: "末尾（脚韻）" },
  { value: "prefix", label: "先頭（頭韻）" },
  { value: "exact", label: "完全一致" },
  { value: "contains", label: "含む" },
];

export default function Home() {
  const [currentPattern, setCurrentPattern] = useState("");
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [rubyFormat, setRubyFormat] = useState<RubyFormat>("katakana");
  const [inputValue, setInputValue] = useState<string | undefined>(undefined);
  const [searchLanguage, setSearchLanguage] = useState<SearchLanguage>("ja");
  const [resultTab, setResultTab] = useState<ResultTab>("search");
  const [position, setPosition] = useState<Position>("suffix");

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

  const {
    input: englishInput,
    results: englishResults,
    total: englishTotal,
    page: englishPage,
    totalPages: englishTotalPages,
    isLoading: englishIsLoading,
    error: englishError,
    searchOptions: englishSearchOptions,
    search: searchEnglish,
    goToPage: goToEnglishPage,
    updateOptions: updateEnglishOptions,
  } = useEnglishRhymeSearch();

  const { history, addToHistory } = useHistory();

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
      if (searchLanguage === "ja") {
        search(reading, currentPattern);
      } else {
        searchEnglish(reading, currentPattern);
      }
      setResultTab("search");
    },
    [addToHistory, search, searchEnglish, currentPattern, searchLanguage]
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
        addToHistory(word);
        if (searchLanguage === "ja") {
          search(word, newPattern);
        } else {
          searchEnglish(word, newPattern);
        }
        setResultTab("search");
      }
    },
    [analyze, search, searchEnglish, searchLanguage, addToHistory]
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

  const handleEnglishWordClick = useCallback(
    (word: string) => {
      // 英語単語クリック時は、その単語の母音パターンで再検索
      // TODO: 英語の発音からパターンを取得するAPI追加後に実装
      const url = `https://www.google.com/search?q=${encodeURIComponent(word + " meaning")}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    []
  );

  const handleEnglishToggleFavorite = useCallback(
    (result: EnglishRhymeResult) => {
      if (isFavorite(result.word)) {
        removeFavorite(result.word);
      } else {
        addFavorite({
          word: result.word,
          reading: result.katakana,
          vowels: result.vowel_pattern,
        });
      }
    },
    [addFavorite, isFavorite, removeFavorite]
  );

  const hasJapaneseResults = input !== null || results.length > 0;
  const hasEnglishResults = englishInput !== null || englishResults.length > 0;
  const hasResults = searchLanguage === "ja" ? hasJapaneseResults : hasEnglishResults;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800">韻スピレーション</h1>
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
            history={history}
            onHistorySelect={handleHistorySelect}
          />

          {/* Settings Row */}
          {phonemes.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {/* Language Select */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500">言語:</label>
                <select
                  value={searchLanguage}
                  onChange={(e) => setSearchLanguage(e.target.value as SearchLanguage)}
                  className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 border-0 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Position Select */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500">韻の位置:</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as Position)}
                  className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 border-0 focus:ring-2 focus:ring-blue-500"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Pattern Builder */}
          {phonemes.length > 0 && (
            <div className="mt-6">
              <PatternBuilder
                phonemes={phonemes}
                preset="custom"
                position={position}
                onPatternChange={handlePatternChange}
                onPositionChange={setPosition}
                showPositionSelector={false}
              />
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[300px]">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
            <button
              onClick={() => setResultTab("search")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                resultTab === "search"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Search className="w-4 h-4" />
              検索結果
              {hasResults && (
                <span className="text-xs text-slate-400">
                  ({searchLanguage === "ja" ? total : englishTotal})
                </span>
              )}
            </button>
            <button
              onClick={() => setResultTab("favorites")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                resultTab === "favorites"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
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
          </div>

          {/* Tab Content */}
          {resultTab === "search" ? (
            hasResults ? (
              searchLanguage === "ja" ? (
                <ResultList
                  language="ja"
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
                <ResultList
                  language="en"
                  input={englishInput}
                  results={englishResults}
                  total={englishTotal}
                  page={englishPage}
                  totalPages={englishTotalPages}
                  isLoading={englishIsLoading}
                  error={englishError}
                  sortOrder={englishSearchOptions.sort}
                  isFavorite={isFavorite}
                  onToggleFavorite={handleEnglishToggleFavorite}
                  onPageChange={goToEnglishPage}
                  onSortChange={(sort) => updateEnglishOptions({ sort })}
                  onWordClick={handleEnglishWordClick}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">韻を探してみよう</p>
                <p className="text-sm mt-1">
                  上の検索ボックスにひらがなを入力してください
                </p>
              </div>
            )
          ) : (
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
