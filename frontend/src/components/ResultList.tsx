"use client";

import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { ResultCard } from "./ResultCard";
import type { PatternAnalyzeResponse, PatternRhymeResult } from "@/types";

interface ResultListProps {
  input: PatternAnalyzeResponse | null;
  pattern: string;
  results: PatternRhymeResult[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  isFavorite: (word: string) => boolean;
  onToggleFavorite: (result: PatternRhymeResult) => void;
  onPageChange: (page: number) => void;
}

export function ResultList({
  input,
  pattern,
  results,
  total,
  page,
  totalPages,
  isLoading,
  error,
  isFavorite,
  onToggleFavorite,
  onPageChange,
}: ResultListProps) {
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="mt-3 text-sm text-slate-500">検索中...</p>
      </div>
    );
  }

  if (!input) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push("...");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Input Analysis */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          入力の解析
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div>
            <span className="text-xl font-bold text-slate-800">{input.reading}</span>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center px-2 py-1 text-xs font-mono bg-blue-100 text-blue-700 rounded">
              母音: {input.vowel_pattern}
            </span>
            {input.consonant_pattern && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-mono bg-emerald-100 text-emerald-700 rounded">
                子音: {input.consonant_pattern}
              </span>
            )}
          </div>
        </div>
        {pattern && (
          <div className="mt-2">
            <span className="text-xs text-slate-500">検索パターン: </span>
            <code className="text-xs font-mono text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
              {pattern}
            </code>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">
          検索結果
          <span className="ml-2 text-sm font-normal text-slate-500">
            {total.toLocaleString()}件
          </span>
        </h2>
        {totalPages > 1 && (
          <span className="text-sm text-slate-500">
            {page} / {totalPages} ページ
          </span>
        )}
      </div>

      {/* No Results Message */}
      {results.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-slate-500">一致する単語が見つかりませんでした</p>
          <p className="text-sm text-slate-400 mt-2">
            別のパターンや、異なる検索タイプを試してみてください
          </p>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((result) => (
            <ResultCard
              key={result.word}
              result={result}
              isFavorite={isFavorite(result.word)}
              onToggleFavorite={() => onToggleFavorite(result)}
            />
          ))}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && results.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className="flex justify-center items-center gap-1 pt-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="前のページ"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {getPageNumbers().map((pageNum, idx) =>
            pageNum === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-slate-400"
              >
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[36px] h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                  page === pageNum
                    ? "bg-blue-500 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {pageNum}
              </button>
            ),
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="次のページ"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
