"use client";

import { useCallback, useMemo } from "react";

import { analyzeReading, searchRhymes } from "@/lib/api";
import type {
  PatternRhymeResult,
  PatternSearchResponse,
  Phoneme,
  SortOrder,
} from "@/types";

import { useSearch } from "./useSearch";
import type { SearchConfig, SearchOptions } from "./useSearch";

function sortJapaneseResults(
  results: PatternRhymeResult[],
  sort: SortOrder
): PatternRhymeResult[] {
  const sorted = [...results];
  switch (sort) {
    case "relevance":
      return sorted.sort((a, b) => b.score - a.score);
    case "reading_asc":
      return sorted.sort((a, b) => a.reading.localeCompare(b.reading, "ja"));
    case "reading_desc":
      return sorted.sort((a, b) => b.reading.localeCompare(a.reading, "ja"));
    case "mora_asc":
      return sorted.sort((a, b) => a.mora_count - b.mora_count);
    case "mora_desc":
      return sorted.sort((a, b) => b.mora_count - a.mora_count);
    default:
      return sorted;
  }
}

const jaSearchConfig: SearchConfig<PatternRhymeResult, PatternSearchResponse> = {
  searchFn: (reading, pattern) =>
    searchRhymes({
      reading,
      pattern,
      sort: "relevance",
      limit: 500,
      offset: 0,
    }),
  extractResults: (response) => response.results,
  extractInput: (response) => response.input,
  extractPattern: (response) => response.pattern,
  getMoraCount: (result) => result.mora_count,
  sortFn: sortJapaneseResults,
};

export function useRhymeSearch(initialOptions: Partial<SearchOptions> = {}) {
  const searchState = useSearch(jaSearchConfig, initialOptions);
  const { setError } = searchState;

  const analyze = useCallback(
    async (reading: string): Promise<Phoneme[] | null> => {
      try {
        const response = await analyzeReading(reading);
        return response.phonemes;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "解析に失敗しました";
        setError(message);
        return null;
      }
    },
    [setError]
  );

  return useMemo(
    () => ({
      input: searchState.input,
      pattern: searchState.pattern,
      results: searchState.results,
      total: searchState.total,
      page: searchState.page,
      totalPages: searchState.totalPages,
      isLoading: searchState.isLoading,
      error: searchState.error,
      searchOptions: searchState.searchOptions,
      maxMoraInResults: searchState.maxMoraInResults,
      analyze,
      search: searchState.search,
      goToPage: searchState.goToPage,
      updateOptions: searchState.updateOptions,
      reset: searchState.reset,
    }),
    [searchState, analyze]
  );
}
