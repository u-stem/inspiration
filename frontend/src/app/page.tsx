"use client";

import { Heart, Loader2, Search } from "lucide-react";
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
type MatchPattern = "all" | "vowel" | "consonant" | "custom";

const POSITIONS: { value: Position; label: string }[] = [
  { value: "suffix", label: "末尾（脚韻）" },
  { value: "prefix", label: "先頭（頭韻）" },
  { value: "exact", label: "完全一致" },
  { value: "contains", label: "含む" },
];

const MATCH_PATTERNS: { value: MatchPattern; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "vowel", label: "母音のみ" },
  { value: "consonant", label: "子音のみ" },
  { value: "custom", label: "カスタム" },
];

export default function Home() {
  const [currentPattern, setCurrentPattern] = useState("");
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [rubyFormat, setRubyFormat] = useState<RubyFormat>("katakana");
  const [inputValue, setInputValue] = useState<string | undefined>(undefined);
  const [searchLanguage, setSearchLanguage] = useState<SearchLanguage>("ja");
  const [resultTab, setResultTab] = useState<ResultTab>("search");
  const [position, setPosition] = useState<Position>("suffix");
  const [matchPattern, setMatchPattern] = useState<MatchPattern>("all");
  const [moraMax, setMoraMax] = useState<number | undefined>(undefined);

  const {
    input,
    results,
    total,
    page,
    totalPages,
    isLoading,
    error,
    searchOptions,
    maxMoraInResults,
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
    maxMoraInResults: englishMaxMoraInResults,
    search: searchEnglish,
    goToPage: goToEnglishPage,
    updateOptions: updateEnglishOptions,
  } = useEnglishRhymeSearch();

  const { history, addToHistory, removeFromHistory, clearHistory } = useHistory();

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
      }
    },
    [analyze]
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
      <header className="bg-white border-b border-slate-200">
        <div className="px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">韻スピレーション</h1>
          <button
            onClick={() => setResultTab(resultTab === "favorites" ? "search" : "favorites")}
            className={`relative p-2 rounded-full transition-colors ${
              resultTab === "favorites"
                ? "bg-red-50 text-red-500"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
            title="お気に入り"
          >
            <Heart className={`w-5 h-5 ${resultTab === "favorites" ? "fill-current" : ""}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {favorites.length > 9 ? "9+" : favorites.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Search & Pattern Builder Section */}
        <div className="mb-6 flex justify-center">
          <div className="flex flex-col items-center">
            {/* Search Input */}
            <div className="mb-4 self-stretch">
              <HiraganaInput
                onSearch={handleSearch}
                onReadingChange={handleReadingChange}
                isLoading={isLoading}
                value={inputValue}
                onValueChange={setInputValue}
                history={history}
                onHistorySelect={handleHistorySelect}
                onHistoryRemove={removeFromHistory}
                onHistoryClear={clearHistory}
                compact
                hideSearchButton
              />
            </div>
            {/* Settings Row - Chip Style */}
            <div className="flex items-center justify-center gap-6 mb-4">
            {/* Language Chips */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">言語</span>
              <div className="flex items-center rounded-full bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setSearchLanguage("ja")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    searchLanguage === "ja"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  日本語
                </button>
                <button
                  type="button"
                  onClick={() => setSearchLanguage("en")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    searchLanguage === "en"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  英語
                </button>
              </div>
            </div>

            {/* Position Chips */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">位置</span>
              <div className="flex items-center rounded-full bg-slate-100 p-0.5">
                {POSITIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPosition(p.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      position === p.value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Match Pattern Chips */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">音素</span>
              <div className="flex items-center rounded-full bg-slate-100 p-0.5">
                {MATCH_PATTERNS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setMatchPattern(p.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      matchPattern === p.value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

            {/* Pattern Builder - カスタム選択時のみUI表示、それ以外はパターン生成のみ */}
            {phonemes.length > 0 && matchPattern === "custom" && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg w-full max-w-3xl">
                <p className="text-xs text-slate-500 text-center mb-3">
                  クリックで子音・母音の音素パターンを切り替え
                </p>
                <PatternBuilder
                  phonemes={phonemes}
                  preset="custom"
                  position={position}
                  matchPattern={matchPattern}
                  onPatternChange={handlePatternChange}
                />
              </div>
            )}
            {/* パターン生成のみ（非表示） */}
            {phonemes.length > 0 && matchPattern !== "custom" && (
              <PatternBuilder
                phonemes={phonemes}
                preset="custom"
                position={position}
                matchPattern={matchPattern}
                onPatternChange={handlePatternChange}
                hidden
              />
            )}

            {/* Search Button */}
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => inputValue && handleSearch(inputValue)}
                disabled={isLoading || !inputValue?.trim() || !currentPattern}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                検索
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mt-8 pt-6 border-t border-slate-200 min-h-[300px]">
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
                  moraMax={moraMax}
                  maxMoraInResults={maxMoraInResults}
                  isFavorite={isFavorite}
                  onToggleFavorite={handleToggleFavorite}
                  onPageChange={goToPage}
                  onRubyFormatChange={setRubyFormat}
                  onSortChange={(sort) => updateOptions({ sort })}
                  onMoraMaxChange={(value) => {
                    setMoraMax(value);
                    updateOptions({ moraMax: value });
                    updateEnglishOptions({ moraMax: value });
                  }}
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
                  moraMax={moraMax}
                  maxMoraInResults={englishMaxMoraInResults}
                  isFavorite={isFavorite}
                  onToggleFavorite={handleEnglishToggleFavorite}
                  onPageChange={goToEnglishPage}
                  onSortChange={(sort) => updateEnglishOptions({ sort })}
                  onMoraMaxChange={(value) => {
                    setMoraMax(value);
                    updateOptions({ moraMax: value });
                    updateEnglishOptions({ moraMax: value });
                  }}
                  onWordClick={handleEnglishWordClick}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {phonemes.length > 0 ? "検索ボタンを押してください" : "韻を探してみよう"}
                </p>
                <p className="text-sm mt-1">
                  {phonemes.length > 0
                    ? "音素パターンを調整して検索できます"
                    : "ひらがなを入力して検索"}
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

    </div>
  );
}
