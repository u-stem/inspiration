"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import type { EnglishRhymeResult, PatternAnalyzeResponse, SortOrder } from "@/types";

import { EnglishResultCard } from "./EnglishResultCard";

interface EnglishResultListProps {
  input: PatternAnalyzeResponse | null;
  results: EnglishRhymeResult[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  sortOrder: SortOrder;
  isFavorite: (word: string) => boolean;
  onToggleFavorite: (result: EnglishRhymeResult) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sort: SortOrder) => void;
  onWordClick: (word: string) => void;
}

export function EnglishResultList({
  input,
  results,
  total,
  totalPages,
  page,
  isLoading,
  error,
  sortOrder,
  isFavorite,
  onToggleFavorite,
  onPageChange,
  onSortChange,
  onWordClick,
}: EnglishResultListProps) {
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (isLoading && results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!input && results.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-500">
          {total > 0 ? (
            <>
              <span className="font-semibold text-slate-700">{total}</span> 件の英単語
            </>
          ) : (
            "結果なし"
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="relevance">関連度順</option>
            <option value="reading_asc">A → Z</option>
            <option value="reading_desc">Z → A</option>
            <option value="mora_asc">音節数（少）</option>
            <option value="mora_desc">音節数（多）</option>
          </select>
        </div>
      </div>

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {results.map((result) => (
            <EnglishResultCard
              key={result.word}
              result={result}
              isFavorite={isFavorite(result.word)}
              onToggleFavorite={() => onToggleFavorite(result)}
              onWordClick={onWordClick}
            />
          ))}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && results.length > 0 && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-600">
            {page} / {totalPages} ページ
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
