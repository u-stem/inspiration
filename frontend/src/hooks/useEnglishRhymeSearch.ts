"use client";

import { useMemo } from "react";

import { ApiError, searchEnglishRhymes } from "@/lib/api";
import type {
  EnglishRhymeResult,
  EnglishSearchResponse,
  SortOrder,
} from "@/types";

import { useSearch } from "./useSearch";
import type { SearchConfig, SearchOptions } from "./useSearch";

function sortEnglishResults(
  results: EnglishRhymeResult[],
  sort: SortOrder
): EnglishRhymeResult[] {
  const sorted = [...results];
  switch (sort) {
    case "relevance":
      return sorted.sort((a, b) => b.score - a.score);
    case "reading_asc":
      return sorted.sort((a, b) => a.word.localeCompare(b.word));
    case "reading_desc":
      return sorted.sort((a, b) => b.word.localeCompare(a.word));
    case "mora_asc":
      return sorted.sort((a, b) => a.syllable_count - b.syllable_count);
    case "mora_desc":
      return sorted.sort((a, b) => b.syllable_count - a.syllable_count);
    default:
      return sorted;
  }
}

function englishErrorHandler(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return "英語辞書が利用できません。インデックスを構築してください。";
    }
    return `検索に失敗しました (${err.status}): ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "検索に失敗しました";
}

const enSearchConfig: SearchConfig<EnglishRhymeResult, EnglishSearchResponse> = {
  searchFn: (reading, pattern) =>
    searchEnglishRhymes({
      reading,
      pattern,
      sort: "relevance",
      limit: 500,
      offset: 0,
    }),
  extractResults: (response) => response.results,
  extractInput: (response) => response.input,
  extractPattern: (response) => response.pattern,
  getMoraCount: (result) => result.syllable_count,
  sortFn: sortEnglishResults,
  errorHandler: englishErrorHandler,
};

export function useEnglishRhymeSearch(initialOptions: Partial<SearchOptions> = {}) {
  const searchState = useSearch(enSearchConfig, initialOptions);

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
      search: searchState.search,
      goToPage: searchState.goToPage,
      updateOptions: searchState.updateOptions,
      reset: searchState.reset,
    }),
    [searchState]
  );
}
