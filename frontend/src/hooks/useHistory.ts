"use client";

import { useCallback } from "react";

import type { HistoryItem } from "@/types";

import { createLocalStorageStore, useLocalStorageStore } from "./useLocalStorage";

const STORAGE_KEY = "rhyme-history";
const MAX_HISTORY = 50;
const EMPTY_HISTORY: HistoryItem[] = [];

function isValidHistoryItem(item: unknown): item is HistoryItem {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.word === "string" && typeof obj.timestamp === "number";
}

const historyStore = createLocalStorageStore<HistoryItem[]>(
  STORAGE_KEY,
  EMPTY_HISTORY,
  isValidHistoryItem,
);

export function useHistory() {
  const history = useLocalStorageStore(historyStore);

  const addToHistory = useCallback((word: string) => {
    const current = historyStore.getSnapshot();
    const filtered = current.filter((item) => item.word !== word);
    const newHistory = [{ word, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
    historyStore.setData(newHistory);
  }, []);

  const removeFromHistory = useCallback((word: string) => {
    const current = historyStore.getSnapshot();
    const newHistory = current.filter((item) => item.word !== word);
    historyStore.setData(newHistory);
  }, []);

  const clearHistory = useCallback(() => {
    historyStore.clear();
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
