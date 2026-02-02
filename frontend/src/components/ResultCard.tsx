"use client";

import { Heart } from "lucide-react";

import type { PatternRhymeResult } from "@/types";

interface ResultCardProps {
  result: PatternRhymeResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function ResultCard({
  result,
  isFavorite,
  onToggleFavorite,
}: ResultCardProps) {
  return (
    <div className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-800 truncate">
            {result.word}
          </h3>
          <p className="text-xs text-slate-500">{result.reading}</p>
        </div>
        <button
          onClick={onToggleFavorite}
          className={`shrink-0 p-1.5 rounded-full transition-colors ${
            isFavorite
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-slate-300 hover:text-red-500 hover:bg-slate-50"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-blue-50 text-blue-600 rounded">
          {result.vowel_pattern}
        </span>
        {result.consonant_pattern && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-600 rounded">
            {result.consonant_pattern}
          </span>
        )}
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded">
          {result.mora_count}音
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${result.score}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-slate-400 w-8 text-right">
          {result.score}%
        </span>
      </div>
    </div>
  );
}
