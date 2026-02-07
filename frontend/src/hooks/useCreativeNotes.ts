"use client";

import { useCallback, useMemo } from "react";

import { analyzeLyrics } from "@/lib/api";
import type { CreativeStats, LyricsEntry } from "@/types";

import { createLocalStorageStore, useLocalStorageStore } from "./useLocalStorage";

const STORAGE_KEY = "creative-notes";
const MAX_ENTRIES = 100;
const EMPTY_ENTRIES: LyricsEntry[] = [];

function isValidEntry(item: unknown): item is LyricsEntry {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.content === "string" &&
    typeof obj.createdAt === "string" &&
    Array.isArray(obj.words)
  );
}

const notesStore = createLocalStorageStore<LyricsEntry[]>(
  STORAGE_KEY,
  EMPTY_ENTRIES,
  isValidEntry,
);

export function useCreativeNotes() {
  const entries = useLocalStorageStore(notesStore);

  const addEntry = useCallback(async (title: string, content: string) => {
    const current = notesStore.getSnapshot();
    if (current.length >= MAX_ENTRIES) return null;

    const response = await analyzeLyrics(content);

    const entry: LyricsEntry = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
      words: response.words,
      rhyme_groups: response.rhyme_groups,
    };

    notesStore.setData([entry, ...current]);
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    const current = notesStore.getSnapshot();
    notesStore.setData(current.filter((e) => e.id !== id));
  }, []);

  const stats: CreativeStats = useMemo(() => {
    const wordUsageCount: Record<string, number> = {};
    const rhymeUsageCount: Record<string, number> = {};

    for (const entry of entries) {
      for (const word of entry.words) {
        wordUsageCount[word.surface] = (wordUsageCount[word.surface] ?? 0) + 1;
        if (word.vowel_pattern) {
          rhymeUsageCount[word.vowel_pattern] = (rhymeUsageCount[word.vowel_pattern] ?? 0) + 1;
        }
      }
    }

    return { wordUsageCount, rhymeUsageCount };
  }, [entries]);

  const getWordUsageCount = useCallback(
    (word: string) => stats.wordUsageCount[word] ?? 0,
    [stats],
  );

  const clearAll = useCallback(() => {
    notesStore.clear();
  }, []);

  return {
    entries,
    stats,
    addEntry,
    removeEntry,
    getWordUsageCount,
    clearAll,
  };
}
