"use client";

import { Loader2, Search } from "lucide-react";
import { type ChangeEvent, type FormEvent, useCallback, useRef, useState } from "react";

interface HiraganaInputProps {
  onSearch: (reading: string) => void;
  onReadingChange?: (reading: string) => void;
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
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
}: HiraganaInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isComposingRef = useRef(false);

  // Use controlled value if provided, otherwise use internal state
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? katakanaToHiragana(controlledValue) : internalValue;

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

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const converted = katakanaToHiragana(raw);
      updateValue(converted);

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

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
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
          type="text"
          value={value}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="韻を探したい読み（ひらがな）を入力..."
          className={`w-full pl-12 pr-24 py-3.5 text-base bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all placeholder:text-slate-400 ${
            error
              ? "border-red-300 focus:ring-red-500"
              : "border-slate-200 focus:ring-blue-500"
          }`}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim() || !!error}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "検索"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">
        カタカナは自動でひらがなに変換されます
      </p>
    </form>
  );
}
