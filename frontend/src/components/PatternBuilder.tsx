"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Phoneme, PresetType } from "@/types";

import { PhonemeDisplay } from "./PhonemeDisplay";

interface PatternBuilderProps {
  phonemes: Phoneme[];
  preset: PresetType;
  position?: Position;
  onPatternChange: (pattern: string) => void;
  onPositionChange?: (position: Position) => void;
  showPositionSelector?: boolean;
  hidden?: boolean;
}

type Position = "prefix" | "suffix" | "contains" | "exact";

function buildPattern(
  phonemes: Phoneme[],
  fixConsonants: boolean[],
  fixVowels: boolean[],
  position: Position
): string {
  if (phonemes.length === 0) return "*";

  const parts: string[] = [];
  for (let i = 0; i < phonemes.length; i++) {
    const phoneme = phonemes[i];
    const consonantFixed = fixConsonants[i] ?? true;
    const vowelFixed = fixVowels[i] ?? true;

    // Handle special case: 促音 (Q with no vowel)
    if (phoneme.consonant === "Q" && !phoneme.vowel) {
      if (consonantFixed) {
        parts.push("Q");
      } else {
        parts.push("_");
      }
      continue;
    }

    if (!consonantFixed && !vowelFixed) {
      parts.push("_");
    } else if (consonantFixed && vowelFixed) {
      parts.push((phoneme.consonant || "") + phoneme.vowel);
    } else if (consonantFixed) {
      parts.push((phoneme.consonant || "") + "_");
    } else {
      parts.push("_" + phoneme.vowel);
    }
  }

  const core = parts.join("");

  switch (position) {
    case "prefix":
      return core + "*";
    case "suffix":
      return "*" + core;
    case "contains":
      return "*" + core + "*";
    case "exact":
      return core;
  }
}

function getPresetConfig(preset: PresetType, len: number) {
  switch (preset) {
    case "suffix":
      return {
        fixConsonants: Array(len).fill(true) as boolean[],
        fixVowels: Array(len).fill(true) as boolean[],
        position: "suffix" as Position,
      };
    case "prefix":
      return {
        fixConsonants: Array(len).fill(true) as boolean[],
        fixVowels: Array(len).fill(true) as boolean[],
        position: "prefix" as Position,
      };
    case "vowel":
      return {
        fixConsonants: Array(len).fill(false) as boolean[],
        fixVowels: Array(len).fill(true) as boolean[],
        position: "suffix" as Position,
      };
    case "contains":
      return {
        fixConsonants: Array(len).fill(true) as boolean[],
        fixVowels: Array(len).fill(true) as boolean[],
        position: "contains" as Position,
      };
    case "exact":
      return {
        fixConsonants: Array(len).fill(true) as boolean[],
        fixVowels: Array(len).fill(true) as boolean[],
        position: "exact" as Position,
      };
    case "custom":
    default:
      return null; // Custom uses state
  }
}

export function PatternBuilder({
  phonemes,
  preset,
  position: externalPosition,
  onPatternChange,
  onPositionChange,
  showPositionSelector = true,
  hidden = false,
}: PatternBuilderProps) {
  const len = phonemes.length;
  const isCustom = preset === "custom";

  // State for custom mode only
  const [customFixConsonants, setCustomFixConsonants] = useState<boolean[]>(
    () => Array(len).fill(true)
  );
  const [customFixVowels, setCustomFixVowels] = useState<boolean[]>(
    () => Array(len).fill(true)
  );
  const [internalPosition, setInternalPosition] = useState<Position>("suffix");

  // Use external position if provided, otherwise use internal
  const customPosition = externalPosition ?? internalPosition;
  const setCustomPosition = onPositionChange ?? setInternalPosition;

  // Reset custom state when phonemes length changes
  useEffect(() => {
    setCustomFixConsonants(Array(len).fill(true));
    setCustomFixVowels(Array(len).fill(true));
  }, [len]);

  // Get config based on preset or custom state
  const presetConfig = useMemo(
    () => getPresetConfig(preset, len),
    [preset, len]
  );

  const fixConsonants = isCustom
    ? customFixConsonants.length === len
      ? customFixConsonants
      : Array(len).fill(true)
    : presetConfig?.fixConsonants ?? Array(len).fill(true);

  const fixVowels = isCustom
    ? customFixVowels.length === len
      ? customFixVowels
      : Array(len).fill(true)
    : presetConfig?.fixVowels ?? Array(len).fill(true);

  const position = isCustom
    ? customPosition
    : presetConfig?.position ?? "suffix";

  // Build current pattern
  const currentPattern = useMemo(
    () => buildPattern(phonemes, fixConsonants, fixVowels, position),
    [phonemes, fixConsonants, fixVowels, position]
  );

  // Notify parent when pattern changes
  useEffect(() => {
    onPatternChange(currentPattern);
  }, [currentPattern, onPatternChange]);

  const handleToggleConsonant = useCallback((index: number) => {
    setCustomFixConsonants((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleToggleVowel = useCallback((index: number) => {
    setCustomFixVowels((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleSetAllConsonantsFixed = useCallback(() => {
    setCustomFixConsonants(Array(len).fill(true));
  }, [len]);

  const handleSetAllConsonantsOptional = useCallback(() => {
    setCustomFixConsonants(Array(len).fill(false));
  }, [len]);

  const handleSetAllVowelsFixed = useCallback(() => {
    setCustomFixVowels(Array(len).fill(true));
  }, [len]);

  const handleSetAllVowelsOptional = useCallback(() => {
    setCustomFixVowels(Array(len).fill(false));
  }, [len]);

  const handleResetAll = useCallback(() => {
    setCustomFixConsonants(Array(len).fill(true));
    setCustomFixVowels(Array(len).fill(true));
  }, [len]);

  if (phonemes.length === 0) {
    return null;
  }

  // When hidden, just run the effect for pattern generation but don't render UI
  if (hidden) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Phoneme Display */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          音素パターン
          {isCustom && (
            <span className="ml-2 text-xs text-slate-400">
              クリックで固定/任意を切り替え
            </span>
          )}
        </label>
        <PhonemeDisplay
          phonemes={phonemes}
          fixConsonants={fixConsonants}
          fixVowels={fixVowels}
          onToggleConsonant={isCustom ? handleToggleConsonant : undefined}
          onToggleVowel={isCustom ? handleToggleVowel : undefined}
          interactive={isCustom}
        />

        {/* Bulk action buttons */}
        {isCustom && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">子音:</span>
              <button
                onClick={handleSetAllConsonantsFixed}
                className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              >
                固定
              </button>
              <button
                onClick={handleSetAllConsonantsOptional}
                className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              >
                任意
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">母音:</span>
              <button
                onClick={handleSetAllVowelsFixed}
                className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              >
                固定
              </button>
              <button
                onClick={handleSetAllVowelsOptional}
                className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded transition-colors"
              >
                任意
              </button>
            </div>
            <button
              onClick={handleResetAll}
              className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded transition-colors"
            >
              リセット
            </button>
          </div>
        )}
      </div>

      {/* Position Selection (only for custom, when not externally controlled, and when showPositionSelector is true) */}
      {isCustom && !externalPosition && showPositionSelector && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            位置
          </label>
          <div className="flex flex-wrap gap-2">
            {(["prefix", "suffix", "exact", "contains"] as Position[]).map((pos) => (
              <button
                key={pos}
                onClick={() => setCustomPosition(pos)}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                  position === pos
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pos === "prefix"
                  ? "先頭（頭韻）"
                  : pos === "suffix"
                    ? "末尾（脚韻）"
                    : pos === "exact"
                      ? "完全一致"
                      : "含む"}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
