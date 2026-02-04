"use client";

import { Clock, Loader2, Search, Trash2, X } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface HistoryItem {
  word: string;
  timestamp: number;
}

interface HiraganaInputProps {
  onSearch: (reading: string) => void;
  onReadingChange?: (reading: string) => void;
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  history?: HistoryItem[];
  onHistorySelect?: (word: string) => void;
  onHistoryRemove?: (word: string) => void;
  onHistoryClear?: () => void;
  compact?: boolean;
  hideSearchButton?: boolean;
}

const HIRAGANA_REGEX = /^[ぁ-ゖー]*$/;

function isHiragana(text: string): boolean {
  return HIRAGANA_REGEX.test(text);
}

function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30A1-\u30F6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

export function HiraganaInput({
  onSearch,
  onReadingChange,
  isLoading = false,
  value: controlledValue,
  onValueChange,
  history = [],
  onHistorySelect,
  onHistoryRemove,
  onHistoryClear,
  compact = false,
  hideSearchButton = false,
}: HiraganaInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const isComposingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Use controlled value if provided, otherwise use internal state
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? katakanaToHiragana(controlledValue) : internalValue;

  // Filter history based on current input (extract words from history items)
  const filteredHistory = useMemo(() => {
    const words = history.map((item) => item.word);
    if (value.trim()) {
      return words.filter((word) => word.includes(value) && word !== value).slice(0, 8);
    }
    return words.slice(0, 8);
  }, [history, value]);

  const updateValue = useCallback(
    (newValue: string) => {
      if (isControlled) {
        onValueChange?.(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [isControlled, onValueChange]
  );

  const handleSelectSuggestion = useCallback(
    (word: string) => {
      updateValue(word);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      onHistorySelect?.(word);
    },
    [onHistorySelect, updateValue]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || filteredHistory.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredHistory.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          if (selectedIndex >= 0) {
            e.preventDefault();
            handleSelectSuggestion(filteredHistory[selectedIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showSuggestions, filteredHistory, selectedIndex, handleSelectSuggestion]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const converted = katakanaToHiragana(raw);
      updateValue(converted);
      setShowSuggestions(true);
      setSelectedIndex(-1);

      if (isComposingRef.current) {
        return;
      }

      if (converted && !isHiragana(converted)) {
        setError("ひらがなで入力してください");
      } else {
        setError(null);
        onReadingChange?.(converted);
      }
    },
    [updateValue, onReadingChange]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false;
      const raw = e.currentTarget.value;
      const converted = katakanaToHiragana(raw);

      if (converted && !isHiragana(converted)) {
        setError("ひらがなで入力してください");
      } else {
        setError(null);
        onReadingChange?.(converted);
      }
    },
    [onReadingChange]
  );

  const handleFocus = useCallback(() => {
    if (history.length > 0) {
      setShowSuggestions(true);
    }
  }, [history.length]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setShowSuggestions(false);
      if (!value.trim()) {
        setError("読みを入力してください");
        return;
      }
      if (!isHiragana(value)) {
        setError("ひらがなで入力してください");
        return;
      }
      onSearch(value.trim());
    },
    [value, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={compact ? "ひらがなで検索..." : "韻を探したい読み（ひらがな）を入力..."}
          className={`w-full border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-slate-400 ${
            compact
              ? hideSearchButton
                ? "px-3 py-2 text-sm bg-slate-50 focus:bg-white"
                : "pl-3 pr-10 py-2 text-sm bg-slate-50 focus:bg-white"
              : hideSearchButton
                ? "px-4 py-3.5 text-base bg-slate-50 focus:bg-white"
                : "pl-4 pr-12 py-3.5 text-base bg-slate-50 focus:bg-white"
          } ${
            error
              ? "border-red-300 focus:ring-red-500"
              : "border-slate-200 focus:ring-blue-500"
          }`}
          disabled={isLoading}
          autoComplete="off"
        />
        {!hideSearchButton && (
          <button
            type="submit"
            disabled={isLoading || !value.trim() || !!error}
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              compact ? "p-1.5" : "p-2"
            }`}
            aria-label="検索"
          >
            {isLoading ? (
              <Loader2 className={`animate-spin ${compact ? "w-4 h-4" : "w-5 h-5"}`} />
            ) : (
              <Search className={compact ? "w-4 h-4" : "w-5 h-5"} />
            )}
          </button>
        )}

        {/* History Suggestions Dropdown */}
        {showSuggestions && filteredHistory.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden"
          >
            {/* Header with clear all button */}
            {onHistoryClear && (
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">検索履歴</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHistoryClear();
                    setShowSuggestions(false);
                  }}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  全削除
                </button>
              </div>
            )}
            <div className="py-1">
              {filteredHistory.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className={`flex items-center transition-colors ${
                    index === selectedIndex
                      ? "bg-blue-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className={`flex-1 px-4 py-2 text-left text-sm flex items-center gap-2 ${
                      index === selectedIndex
                        ? "text-blue-700"
                        : "text-slate-700"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {item}
                  </button>
                  {onHistoryRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHistoryRemove(item);
                      }}
                      className="px-3 py-2 text-slate-300 hover:text-red-500 transition-colors"
                      title="削除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className={`text-red-500 ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}>{error}</p>}
      {!compact && (
        <p className="mt-2 text-xs text-slate-400">
          カタカナは自動でひらがなに変換されます
        </p>
      )}
    </form>
  );
}
