"use client";

import { useCallback, useMemo, useState } from "react";

import { ApiError } from "@/lib/api";
import type { PatternAnalyzeResponse, SortOrder } from "@/types";

interface SearchResult {
  score: number;
}

interface SearchConfig<TResult extends SearchResult, TResponse> {
  searchFn: (reading: string, pattern: string) => Promise<TResponse>;
  extractResults: (response: TResponse) => TResult[];
  extractInput: (response: TResponse) => PatternAnalyzeResponse;
  extractPattern: (response: TResponse) => string;
  getMoraCount: (result: TResult) => number;
  sortFn: (results: TResult[], sort: SortOrder) => TResult[];
  errorHandler?: (err: unknown) => string;
}

interface SearchOptions {
  sort: SortOrder;
  limit: number;
  moraMin?: number;
  moraMax?: number;
}

const DEFAULT_OPTIONS: SearchOptions = {
  sort: "relevance",
  limit: 20,
  moraMin: undefined,
  moraMax: undefined,
};

interface UseSearchState<TResult> {
  input: PatternAnalyzeResponse | null;
  pattern: string;
  allResults: TResult[];
  isLoading: boolean;
  error: string | null;
}

function defaultErrorHandler(err: unknown): string {
  if (err instanceof ApiError) {
    return `検索に失敗しました (${err.status}): ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "検索に失敗しました";
}

export function useSearch<TResult extends SearchResult, TResponse>(
  config: SearchConfig<TResult, TResponse>,
  initialOptions: Partial<SearchOptions> = {}
) {
  const [state, setState] = useState<UseSearchState<TResult>>({
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

  const maxMoraInResults = useMemo(() => {
    if (state.allResults.length === 0) return undefined;
    return Math.max(...state.allResults.map((r) => config.getMoraCount(r)));
  }, [state.allResults, config]);

  const effectiveMoraMax = searchOptions.moraMax ?? maxMoraInResults;

  const filteredResults = useMemo(() => {
    let filtered = state.allResults;
    if (effectiveMoraMax !== undefined) {
      filtered = filtered.filter(
        (r) => config.getMoraCount(r) <= effectiveMoraMax
      );
    }
    return filtered;
  }, [state.allResults, effectiveMoraMax, config]);

  const sortedResults = useMemo(
    () => config.sortFn(filteredResults, searchOptions.sort),
    [filteredResults, searchOptions.sort, config]
  );

  const total = filteredResults.length;
  const totalPages = Math.max(1, Math.ceil(total / searchOptions.limit));
  const results = useMemo(() => {
    const start = (page - 1) * searchOptions.limit;
    return sortedResults.slice(start, start + searchOptions.limit);
  }, [sortedResults, page, searchOptions.limit]);

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
        const response = await config.searchFn(reading.trim(), pattern.trim());

        setState({
          input: config.extractInput(response),
          pattern: config.extractPattern(response),
          allResults: config.extractResults(response),
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const handler = config.errorHandler ?? defaultErrorHandler;
        const message = handler(err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
      }
    },
    [config]
  );

  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
      }
    },
    [totalPages]
  );

  const updateOptions = useCallback((updates: Partial<SearchOptions>) => {
    setSearchOptions((prev) => ({ ...prev, ...updates }));
    if (updates.limit) {
      setPage(1);
    }
  }, []);

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

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
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
    maxMoraInResults,
    search,
    goToPage,
    updateOptions,
    reset,
    setError,
  };
}

export type { SearchConfig, SearchOptions, SearchResult };
