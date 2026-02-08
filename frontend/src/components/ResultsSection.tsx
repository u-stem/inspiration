"use client";

import { Search } from "lucide-react";

import { FavoritesPanel } from "./FavoritesPanel";
import { ResultList } from "./ResultList";
import type {
  EnglishRhymeResult,
  FavoriteItem,
  PatternAnalyzeResponse,
  PatternRhymeResult,
  Phoneme,
  ResultTab,
  RubyFormat,
  SearchLanguage,
  SortOrder,
} from "@/types";

interface ResultsSectionProps {
  resultTab: ResultTab;
  searchLanguage: SearchLanguage;
  phonemes: Phoneme[];
  // Japanese search state
  input: PatternAnalyzeResponse | null;
  results: PatternRhymeResult[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  rubyFormat: RubyFormat;
  sortOrder: SortOrder;
  moraMax: number | undefined;
  maxMoraInResults: number | undefined;
  // English search state
  englishInput: PatternAnalyzeResponse | null;
  englishResults: EnglishRhymeResult[];
  englishTotal: number;
  englishPage: number;
  englishTotalPages: number;
  englishIsLoading: boolean;
  englishError: string | null;
  englishSortOrder: SortOrder;
  englishMaxMoraInResults: number | undefined;
  // Favorites
  favorites: FavoriteItem[];
  isFavorite: (word: string) => boolean;
  // Callbacks
  onToggleFavorite: (result: PatternRhymeResult) => void;
  onEnglishToggleFavorite: (result: EnglishRhymeResult) => void;
  onPageChange: (page: number) => void;
  onEnglishPageChange: (page: number) => void;
  onRubyFormatChange: (format: RubyFormat) => void;
  onSortChange: (sort: SortOrder) => void;
  onEnglishSortChange: (sort: SortOrder) => void;
  onMoraMaxChange: (value: number | undefined) => void;
  onWordClick: (word: string, reading: string) => void;
  onEnglishWordClick: (word: string) => void;
  onRemoveFavorite: (word: string) => void;
  onExportFavorites: () => void;
  onClearFavorites: () => void;
}

export function ResultsSection({
  resultTab,
  searchLanguage,
  phonemes,
  input,
  results,
  total,
  page,
  totalPages,
  isLoading,
  error,
  rubyFormat,
  sortOrder,
  moraMax,
  maxMoraInResults,
  englishInput,
  englishResults,
  englishTotal,
  englishPage,
  englishTotalPages,
  englishIsLoading,
  englishError,
  englishSortOrder,
  englishMaxMoraInResults,
  favorites,
  isFavorite,
  onToggleFavorite,
  onEnglishToggleFavorite,
  onPageChange,
  onEnglishPageChange,
  onRubyFormatChange,
  onSortChange,
  onEnglishSortChange,
  onMoraMaxChange,
  onWordClick,
  onEnglishWordClick,
  onRemoveFavorite,
  onExportFavorites,
  onClearFavorites,
}: ResultsSectionProps) {
  const hasJapaneseResults = input !== null || results.length > 0;
  const hasEnglishResults = englishInput !== null || englishResults.length > 0;
  const hasResults =
    searchLanguage === "ja" ? hasJapaneseResults : hasEnglishResults;

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 min-h-[300px]">
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
              sortOrder={sortOrder}
              moraMax={moraMax}
              maxMoraInResults={maxMoraInResults}

              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onPageChange={onPageChange}
              onRubyFormatChange={onRubyFormatChange}
              onSortChange={onSortChange}
              onMoraMaxChange={onMoraMaxChange}
              onWordClick={onWordClick}
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
              sortOrder={englishSortOrder}
              moraMax={moraMax}
              maxMoraInResults={englishMaxMoraInResults}

              isFavorite={isFavorite}
              onToggleFavorite={onEnglishToggleFavorite}
              onPageChange={onEnglishPageChange}
              onSortChange={onEnglishSortChange}
              onMoraMaxChange={onMoraMaxChange}
              onWordClick={onEnglishWordClick}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {phonemes.length > 0
                ? "検索ボタンを押してください"
                : "韻を探してみよう"}
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
          onRemove={onRemoveFavorite}
          onExport={onExportFavorites}
          onClear={onClearFavorites}
        />
      )}
    </div>
  );
}
