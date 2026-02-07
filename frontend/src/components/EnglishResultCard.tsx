"use client";

import { Check, Copy, ExternalLink, Heart, Volume2 } from "lucide-react";
import { useState } from "react";

import { useSpeech } from "@/hooks/useSpeech";
import type { EnglishRhymeResult } from "@/types";

interface EnglishResultCardProps {
  result: EnglishRhymeResult;
  isFavorite: boolean;
  usageCount?: number;
  onToggleFavorite: () => void;
  onWordClick: (word: string) => void;
}

export function EnglishResultCard({
  result,
  isFavorite,
  usageCount,
  onToggleFavorite,
  onWordClick,
}: EnglishResultCardProps) {
  const [copied, setCopied] = useState<"word" | "katakana" | null>(null);
  const { speak, isSpeaking, isSupported } = useSpeech({ lang: "en-US" });

  const copyToClipboard = async (text: string, type: "word" | "katakana") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCopyWord = () => {
    copyToClipboard(result.word, "word");
  };

  const handleCopyWithKatakana = () => {
    const text = `${result.word}(${result.katakana})`;
    copyToClipboard(text, "katakana");
  };

  const handleWebSearch = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(result.word + " meaning")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-3 bg-white rounded-lg border border-slate-200">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <button
            onClick={() => onWordClick(result.word)}
            className="text-base font-bold text-slate-800 break-all hover:text-blue-600 hover:underline transition-colors text-left"
            title="この単語で検索"
          >
            {result.word}
          </button>
          <p className="text-xs text-slate-500">{result.katakana}</p>
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
        {result.consonant_pattern && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-blue-50 text-blue-600 rounded">
            {result.consonant_pattern}
          </span>
        )}
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-600 rounded">
          {result.vowel_pattern}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded">
          {result.syllable_count}音節
        </span>
        {usageCount !== undefined && usageCount > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-600 rounded">
            {usageCount}回使用
          </span>
        )}
      </div>

      {/* Similarity Score */}
      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              result.similarity_score >= 0.8
                ? "bg-emerald-500"
                : result.similarity_score >= 0.5
                  ? "bg-blue-500"
                  : "bg-slate-300"
            }`}
            style={{ width: `${Math.round(result.similarity_score * 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-slate-400 w-10 text-right">
          {Math.round(result.similarity_score * 100)}%
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1">
        {isSupported && (
          <button
            onClick={() => speak(result.word)}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isSpeaking
                ? "text-blue-600 bg-blue-50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
            title="読み上げ"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>読む</span>
          </button>
        )}

        <button
          onClick={handleCopyWord}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
          title="コピー"
        >
          {copied === "word" ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>コピー</span>
        </button>

        <button
          onClick={handleCopyWithKatakana}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
          title="カタカナ付きコピー"
        >
          {copied === "katakana" ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>カナ</span>
        </button>

        <button
          onClick={handleWebSearch}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors ml-auto"
          title="Web検索"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>検索</span>
        </button>
      </div>
    </div>
  );
}
