"use client";

import { Clock, Loader2, Search } from "lucide-react";
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="韻を探したい読み（ひらがな）を入力..."
          className={`w-full pl-12 pr-24 py-3.5 text-base bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all placeholder:text-slate-400 ${
            error
              ? "border-red-300 focus:ring-red-500"
              : "border-slate-200 focus:ring-blue-500"
          }`}
          disabled={isLoading}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim() || !!error}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "検索"}
        </button>

        {/* History Suggestions Dropdown */}
        {showSuggestions && filteredHistory.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden"
          >
            <div className="py-1">
              {filteredHistory.map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    index === selectedIndex
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">
        カタカナは自動でひらがなに変換されます
      </p>
    </form>
  );
}
