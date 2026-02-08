"use client";

import { useCallback, useMemo } from "react";

import { analyzePhoneme } from "@/lib/api";
import type { CreativeStats, LyricsEntry, RhymeAnnotation } from "@/types";

import { createLocalStorageStore, useLocalStorageStore } from "./useLocalStorage";

const STORAGE_KEY = "creative-notes-v2";
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
    Array.isArray(obj.annotations)
  );
}

const notesStore = createLocalStorageStore<LyricsEntry[]>(
  STORAGE_KEY,
  EMPTY_ENTRIES,
  isValidEntry,
);

export function useCreativeNotes() {
  const entries = useLocalStorageStore(notesStore);

  const addEntry = useCallback((title: string, content: string) => {
    const current = notesStore.getSnapshot();
    if (current.length >= MAX_ENTRIES) return null;

    const entry: LyricsEntry = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
      annotations: [],
    };

    notesStore.setData([entry, ...current]);
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    const current = notesStore.getSnapshot();
    notesStore.setData(current.filter((e) => e.id !== id));
  }, []);

  const addAnnotation = useCallback(
    async (
      entryId: string,
      color: string,
      startOffset: number,
      endOffset: number,
      text: string,
    ): Promise<RhymeAnnotation | null> => {
      const response = await analyzePhoneme(text);

      const annotation: RhymeAnnotation = {
        id: crypto.randomUUID(),
        color,
        startOffset,
        endOffset,
        text,
        vowelPattern: response.vowel_pattern,
      };

      const current = notesStore.getSnapshot();
      notesStore.setData(
        current.map((e) =>
          e.id === entryId
            ? { ...e, annotations: [...e.annotations, annotation] }
            : e,
        ),
      );

      return annotation;
    },
    [],
  );

  const removeAnnotation = useCallback(
    (entryId: string, annotationId: string) => {
      const current = notesStore.getSnapshot();
      notesStore.setData(
        current.map((e) =>
          e.id === entryId
            ? {
                ...e,
                annotations: e.annotations.filter((a) => a.id !== annotationId),
              }
            : e,
        ),
      );
    },
    [],
  );

  const updateAnnotation = useCallback(
    (entryId: string, annotationId: string, color: string) => {
      const current = notesStore.getSnapshot();
      notesStore.setData(
        current.map((e) =>
          e.id === entryId
            ? {
                ...e,
                annotations: e.annotations.map((a) =>
                  a.id === annotationId ? { ...a, color } : a,
                ),
              }
            : e,
        ),
      );
    },
    [],
  );

  const stats: CreativeStats = useMemo(() => {
    const rhymePatternCount: Record<string, number> = {};

    for (const entry of entries) {
      for (const annotation of entry.annotations) {
        if (annotation.vowelPattern) {
          rhymePatternCount[annotation.vowelPattern] =
            (rhymePatternCount[annotation.vowelPattern] ?? 0) + 1;
        }
      }
    }

    return { rhymePatternCount };
  }, [entries]);

  const clearAll = useCallback(() => {
    notesStore.clear();
  }, []);

  return {
    entries,
    stats,
    addEntry,
    removeEntry,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    clearAll,
  };
}
