"use client";

import { Loader2, Search } from "lucide-react";

import { HiraganaInput } from "./HiraganaInput";
import { PatternBuilder } from "./PatternBuilder";
import type { HistoryItem, Phoneme, SearchLanguage } from "@/types";

type Position = "prefix" | "suffix" | "contains" | "exact";
type MatchPattern = "all" | "vowel" | "consonant" | "custom";

const POSITIONS: { value: Position; label: string }[] = [
  { value: "suffix", label: "末尾（脚韻）" },
  { value: "prefix", label: "先頭（頭韻）" },
  { value: "exact", label: "完全一致" },
  { value: "contains", label: "含む" },
];

const MATCH_PATTERNS: { value: MatchPattern; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "vowel", label: "母音のみ" },
  { value: "consonant", label: "子音のみ" },
  { value: "custom", label: "カスタム" },
];

interface SearchSectionProps {
  inputValue: string | undefined;
  phonemes: Phoneme[];
  currentPattern: string;
  searchLanguage: SearchLanguage;
  position: Position;
  matchPattern: MatchPattern;
  isLoading: boolean;
  history: HistoryItem[];
  onInputValueChange: (value: string | undefined) => void;
  onSearch: (reading: string) => void;
  onReadingChange: (reading: string) => void;
  onPatternChange: (pattern: string) => void;
  onSearchLanguageChange: (lang: SearchLanguage) => void;
  onPositionChange: (pos: Position) => void;
  onMatchPatternChange: (mp: MatchPattern) => void;
  onHistorySelect: (word: string) => void;
  onHistoryRemove: (word: string) => void;
  onHistoryClear: () => void;
}

export function SearchSection({
  inputValue,
  phonemes,
  currentPattern,
  searchLanguage,
  position,
  matchPattern,
  isLoading,
  history,
  onInputValueChange,
  onSearch,
  onReadingChange,
  onPatternChange,
  onSearchLanguageChange,
  onPositionChange,
  onMatchPatternChange,
  onHistorySelect,
  onHistoryRemove,
  onHistoryClear,
}: SearchSectionProps) {
  return (
    <div className="mb-6 flex justify-center">
      <div className="flex flex-col items-center">
        {/* Search Input */}
        <div className="mb-4 self-stretch">
          <HiraganaInput
            onSearch={onSearch}
            onReadingChange={onReadingChange}
            isLoading={isLoading}
            value={inputValue}
            onValueChange={onInputValueChange}
            history={history}
            onHistorySelect={onHistorySelect}
            onHistoryRemove={onHistoryRemove}
            onHistoryClear={onHistoryClear}
            compact
            hideSearchButton
          />
        </div>
        {/* Settings Row - Chip Style */}
        <div className="flex items-center justify-center gap-6 mb-4">
          {/* Language Chips */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">言語</span>
            <div className="flex items-center rounded-full bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => onSearchLanguageChange("ja")}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  searchLanguage === "ja"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                日本語
              </button>
              <button
                type="button"
                onClick={() => onSearchLanguageChange("en")}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  searchLanguage === "en"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                英語
              </button>
            </div>
          </div>

          {/* Position Chips */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">位置</span>
            <div className="flex items-center rounded-full bg-slate-100 p-0.5">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onPositionChange(p.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    position === p.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Match Pattern Chips */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">音素</span>
            <div className="flex items-center rounded-full bg-slate-100 p-0.5">
              {MATCH_PATTERNS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onMatchPatternChange(p.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    matchPattern === p.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pattern Builder - custom mode shows UI, otherwise pattern generation only */}
        {phonemes.length > 0 && matchPattern === "custom" && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg w-full max-w-3xl">
            <p className="text-xs text-slate-500 text-center mb-3">
              クリックで子音・母音の音素パターンを切り替え
            </p>
            <PatternBuilder
              phonemes={phonemes}
              preset="custom"
              position={position}
              matchPattern={matchPattern}
              onPatternChange={onPatternChange}
            />
          </div>
        )}
        {phonemes.length > 0 && matchPattern !== "custom" && (
          <PatternBuilder
            phonemes={phonemes}
            preset="custom"
            position={position}
            matchPattern={matchPattern}
            onPatternChange={onPatternChange}
            hidden
          />
        )}

        {/* Search Button */}
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => inputValue && onSearch(inputValue)}
            disabled={isLoading || !inputValue?.trim() || !currentPattern}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            検索
          </button>
        </div>
      </div>
    </div>
  );
}
