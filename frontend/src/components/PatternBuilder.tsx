"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Phoneme, PresetType } from "@/types";

import { PhonemeDisplay } from "./PhonemeDisplay";

type Position = "prefix" | "suffix" | "contains" | "exact";
type MatchPattern = "all" | "vowel" | "consonant" | "custom";

interface PatternBuilderProps {
  phonemes: Phoneme[];
  preset: PresetType;
  position?: Position;
  matchPattern?: MatchPattern;
  onPatternChange: (pattern: string) => void;
  onPositionChange?: (position: Position) => void;
  showPositionSelector?: boolean;
  hidden?: boolean;
}

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
  matchPattern = "all",
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

  // カスタムモードに切り替えた時だけ状態をリセット
  const prevMatchPatternRef = useRef(matchPattern);
  useEffect(() => {
    if (matchPattern === "custom" && prevMatchPatternRef.current !== "custom") {
      // カスタムに切り替えた時は全選択状態にリセット
      setCustomFixConsonants(Array(len).fill(true));
      setCustomFixVowels(Array(len).fill(true));
    }
    prevMatchPatternRef.current = matchPattern;
  }, [matchPattern, len]);

  // Get config based on preset or custom state
  const presetConfig = useMemo(
    () => getPresetConfig(preset, len),
    [preset, len]
  );

  // matchPatternから直接値を導出（カスタム以外）、カスタム時は内部状態を使用
  const fixConsonants = useMemo(() => {
    if (matchPattern === "custom") {
      return customFixConsonants.length === len ? customFixConsonants : Array(len).fill(true);
    }
    switch (matchPattern) {
      case "vowel":
        return Array(len).fill(false);
      case "consonant":
      case "all":
      default:
        return Array(len).fill(true);
    }
  }, [matchPattern, customFixConsonants, len]);

  const fixVowels = useMemo(() => {
    if (matchPattern === "custom") {
      return customFixVowels.length === len ? customFixVowels : Array(len).fill(true);
    }
    switch (matchPattern) {
      case "consonant":
        return Array(len).fill(false);
      case "vowel":
      case "all":
      default:
        return Array(len).fill(true);
    }
  }, [matchPattern, customFixVowels, len]);

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
    <div className="flex justify-center">
      <PhonemeDisplay
        phonemes={phonemes}
        fixConsonants={fixConsonants}
        fixVowels={fixVowels}
        onToggleConsonant={isCustom ? handleToggleConsonant : undefined}
        onToggleVowel={isCustom ? handleToggleVowel : undefined}
        interactive={isCustom}
      />
    </div>
  );
}
