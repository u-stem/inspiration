"use client";

import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { ResultCard } from "./ResultCard";
import type { PatternAnalyzeResponse, PatternRhymeResult, SortOrder } from "@/types";

type RubyFormat = "katakana" | "half-katakana" | "hiragana";

const SORTS: { value: SortOrder; label: string }[] = [
  { value: "relevance", label: "関連度順" },
  { value: "reading_asc", label: "五十音順（昇順）" },
  { value: "reading_desc", label: "五十音順（降順）" },
  { value: "mora_asc", label: "モーラ数（短い順）" },
  { value: "mora_desc", label: "モーラ数（長い順）" },
];

const RUBY_FORMATS: { value: RubyFormat; label: string }[] = [
  { value: "katakana", label: "カタカナ" },
  { value: "half-katakana", label: "半角カタカナ" },
  { value: "hiragana", label: "ひらがな" },
];

interface ResultListProps {
  input: PatternAnalyzeResponse | null;
  results: PatternRhymeResult[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  rubyFormat: RubyFormat;
  sortOrder: SortOrder;
  isFavorite: (word: string) => boolean;
  onToggleFavorite: (result: PatternRhymeResult) => void;
  onPageChange: (page: number) => void;
  onRubyFormatChange: (format: RubyFormat) => void;
  onSortChange: (sort: SortOrder) => void;
  onWordClick: (word: string, reading: string) => void;
}

export function ResultList({
  input,
  results,
  total,
  page,
  totalPages,
  isLoading,
  error,
  rubyFormat,
  sortOrder,
  isFavorite,
  onToggleFavorite,
  onPageChange,
  onRubyFormatChange,
  onSortChange,
  onWordClick,
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
      {/* Results Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-lg font-bold text-slate-800">
          検索結果
          <span className="ml-2 text-sm font-normal text-slate-500">
            {total.toLocaleString()}件
          </span>
        </h2>
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500">ルビ:</label>
            <select
              value={rubyFormat}
              onChange={(e) => onRubyFormatChange(e.target.value as RubyFormat)}
              className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 border-0 focus:ring-2 focus:ring-blue-500"
            >
              {RUBY_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500">並び順:</label>
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as SortOrder)}
              className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 border-0 focus:ring-2 focus:ring-blue-500"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {totalPages > 1 && (
            <span className="text-xs text-slate-500">
              {page} / {totalPages} ページ
            </span>
          )}
        </div>
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
              rubyFormat={rubyFormat}
              isFavorite={isFavorite(result.word)}
              onToggleFavorite={() => onToggleFavorite(result)}
              onWordClick={onWordClick}
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
            onClick={(e) => {
              e.currentTarget.blur();
              onPageChange(page - 1);
            }}
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
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPageChange(pageNum);
                }}
                className={`min-w-[36px] h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                  page === pageNum
                    ? "bg-blue-500 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label={`${pageNum}ページ目`}
                aria-current={page === pageNum ? "page" : undefined}
              >
                {pageNum}
              </button>
            ),
          )}

          <button
            onClick={(e) => {
              e.currentTarget.blur();
              onPageChange(page + 1);
            }}
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
