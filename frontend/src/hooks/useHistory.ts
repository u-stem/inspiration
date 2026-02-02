"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { HistoryItem } from "@/types";

const STORAGE_KEY = "rhyme-history";
const MAX_HISTORY = 50;
const EMPTY_HISTORY: HistoryItem[] = [];

let cachedHistory: HistoryItem[] = EMPTY_HISTORY;
let cachedStorageValue: string | null = null;

function isValidHistoryItem(item: unknown): item is HistoryItem {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.word === "string" && typeof obj.timestamp === "number";
}

function getSnapshot(): HistoryItem[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === cachedStorageValue) {
    return cachedHistory;
  }
  cachedStorageValue = stored;
  if (!stored) {
    cachedHistory = EMPTY_HISTORY;
    return cachedHistory;
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      cachedHistory = EMPTY_HISTORY;
      return cachedHistory;
    }
    cachedHistory = parsed.filter(isValidHistoryItem);
  } catch {
    cachedHistory = EMPTY_HISTORY;
  }
  return cachedHistory;
}

function getServerSnapshot(): HistoryItem[] {
  return EMPTY_HISTORY;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useHistory() {
  const history = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addToHistory = useCallback((word: string) => {
    const current = getSnapshot();
    const filtered = current.filter((item) => item.word !== word);
    const newHistory = [
      { word, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_HISTORY);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    window.dispatchEvent(new Event("storage"));
  }, []);

  const removeFromHistory = useCallback((word: string) => {
    const current = getSnapshot();
    const newHistory = current.filter((item) => item.word !== word);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    window.dispatchEvent(new Event("storage"));
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("storage"));
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
