"use client";

import { Heart } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { ResultsSection, SearchSection } from "@/components";
import { useEnglishRhymeSearch } from "@/hooks/useEnglishRhymeSearch";
import { useFavorites } from "@/hooks/useFavorites";
import { useHistory } from "@/hooks/useHistory";
import { useRhymeSearch } from "@/hooks/useRhymeSearch";
import type { EnglishRhymeResult, PatternRhymeResult, Phoneme, SearchLanguage } from "@/types";

type RubyFormat = "katakana" | "half-katakana" | "hiragana";
type ResultTab = "search" | "favorites";

export default function Home() {
  const [currentPattern, setCurrentPattern] = useState("");
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [rubyFormat, setRubyFormat] = useState<RubyFormat>("katakana");
  const [inputValue, setInputValue] = useState<string | undefined>(undefined);
  const [searchLanguage, setSearchLanguage] = useState<SearchLanguage>("ja");
  const [resultTab, setResultTab] = useState<ResultTab>("search");
  const [position, setPosition] = useState<"prefix" | "suffix" | "contains" | "exact">("suffix");
  const [matchPattern, setMatchPattern] = useState<"all" | "vowel" | "consonant" | "custom">("all");
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

  const handleMoraMaxChange = useCallback(
    (value: number | undefined) => {
      setMoraMax(value);
      updateOptions({ moraMax: value });
      updateEnglishOptions({ moraMax: value });
    },
    [updateOptions, updateEnglishOptions]
  );

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
        <SearchSection
          inputValue={inputValue}
          phonemes={phonemes}
          currentPattern={currentPattern}
          searchLanguage={searchLanguage}
          position={position}
          matchPattern={matchPattern}
          isLoading={isLoading}
          history={history}
          onInputValueChange={setInputValue}
          onSearch={handleSearch}
          onReadingChange={handleReadingChange}
          onPatternChange={handlePatternChange}
          onSearchLanguageChange={setSearchLanguage}
          onPositionChange={setPosition}
          onMatchPatternChange={setMatchPattern}
          onHistorySelect={handleHistorySelect}
          onHistoryRemove={removeFromHistory}
          onHistoryClear={clearHistory}
        />

        <ResultsSection
          resultTab={resultTab}
          searchLanguage={searchLanguage}
          phonemes={phonemes}
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
          englishInput={englishInput}
          englishResults={englishResults}
          englishTotal={englishTotal}
          englishPage={englishPage}
          englishTotalPages={englishTotalPages}
          englishIsLoading={englishIsLoading}
          englishError={englishError}
          englishSortOrder={englishSearchOptions.sort}
          englishMaxMoraInResults={englishMaxMoraInResults}
          favorites={favorites}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          onEnglishToggleFavorite={handleEnglishToggleFavorite}
          onPageChange={goToPage}
          onEnglishPageChange={goToEnglishPage}
          onRubyFormatChange={setRubyFormat}
          onSortChange={(sort) => updateOptions({ sort })}
          onEnglishSortChange={(sort) => updateEnglishOptions({ sort })}
          onMoraMaxChange={handleMoraMaxChange}
          onWordClick={handleWordClick}
          onEnglishWordClick={handleEnglishWordClick}
          onRemoveFavorite={removeFavorite}
          onExportFavorites={exportFavorites}
          onClearFavorites={clearFavorites}
        />
      </main>
    </div>
  );
}
