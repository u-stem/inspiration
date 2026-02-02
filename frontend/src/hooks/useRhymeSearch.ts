"use client";

import { useCallback, useMemo, useState } from "react";

import { analyzeReading, ApiError, searchRhymes } from "@/lib/api";
import type {
  PatternAnalyzeResponse,
  PatternRhymeResult,
  PatternSearchResponse,
  Phoneme,
  SortOrder,
} from "@/types";

interface UseRhymeSearchState {
  input: PatternAnalyzeResponse | null;
  pattern: string;
  allResults: PatternRhymeResult[];
  isLoading: boolean;
  error: string | null;
}

interface SearchOptions {
  sort: SortOrder;
  limit: number;
}

const DEFAULT_OPTIONS: SearchOptions = {
  sort: "relevance",
  limit: 20,
};

function sortResults(
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

export function useRhymeSearch(initialOptions: Partial<SearchOptions> = {}) {
  const [state, setState] = useState<UseRhymeSearchState>({
    input: null,
    pattern: "",
    allResults: [],
    isLoading: false,
    error: null,
  });

  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    ...DEFAULT_OPTIONS,
    ...initialOptions,
  });

  const [page, setPage] = useState(1);

  const sortedResults = useMemo(
    () => sortResults(state.allResults, searchOptions.sort),
    [state.allResults, searchOptions.sort]
  );

  const total = state.allResults.length;
  const totalPages = Math.max(1, Math.ceil(total / searchOptions.limit));
  const results = useMemo(() => {
    const start = (page - 1) * searchOptions.limit;
    return sortedResults.slice(start, start + searchOptions.limit);
  }, [sortedResults, page, searchOptions.limit]);

  const analyze = useCallback(
    async (reading: string): Promise<Phoneme[] | null> => {
      try {
        const response = await analyzeReading(reading);
        return response.phonemes;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "解析に失敗しました";
        setState((prev) => ({
          ...prev,
          error: message,
        }));
        return null;
      }
    },
    []
  );

  const search = useCallback(
    async (reading: string, pattern: string) => {
      if (!reading.trim() || !pattern.trim()) {
        setState((prev) => ({
          ...prev,
          error: "読みとパターンを入力してください",
        }));
        return;
      }

      setPage(1);
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response: PatternSearchResponse = await searchRhymes({
          reading: reading.trim(),
          pattern: pattern.trim(),
          sort: "relevance",
          limit: 500,
          offset: 0,
        });

        setState({
          input: response.input,
          pattern: response.pattern,
          allResults: response.results,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        let message: string;
        if (err instanceof ApiError) {
          message = `検索に失敗しました (${err.status}): ${err.message}`;
        } else if (err instanceof Error) {
          message = err.message;
        } else {
          message = "検索に失敗しました";
        }
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
      }
    },
    []
  );

  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
      }
    },
    [totalPages]
  );

  const updateOptions = useCallback(
    (updates: Partial<SearchOptions>) => {
      setSearchOptions((prev) => ({ ...prev, ...updates }));
      if (updates.limit) {
        setPage(1);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      input: null,
      pattern: "",
      allResults: [],
      isLoading: false,
      error: null,
    });
    setPage(1);
  }, []);

  return {
    input: state.input,
    pattern: state.pattern,
    results,
    total,
    page,
    totalPages,
    isLoading: state.isLoading,
    error: state.error,
    searchOptions,
    analyze,
    search,
    goToPage,
    updateOptions,
    reset,
  };
}
