"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { FavoriteItem } from "@/types";

const STORAGE_KEY = "rhyme-favorites";
const MAX_FAVORITES = 500;
const EMPTY_FAVORITES: FavoriteItem[] = [];

let cachedFavorites: FavoriteItem[] = EMPTY_FAVORITES;
let cachedStorageValue: string | null = null;

interface AddFavoriteInput {
  word: string;
  reading: string;
  vowels: string;
}

function isValidFavoriteItem(item: unknown): item is FavoriteItem {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.word === "string" &&
    typeof obj.reading === "string" &&
    typeof obj.vowels === "string" &&
    typeof obj.addedAt === "number"
  );
}

function getSnapshot(): FavoriteItem[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === cachedStorageValue) {
    return cachedFavorites;
  }
  cachedStorageValue = stored;
  if (!stored) {
    cachedFavorites = EMPTY_FAVORITES;
    return cachedFavorites;
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      cachedFavorites = EMPTY_FAVORITES;
      return cachedFavorites;
    }
    cachedFavorites = parsed.filter(isValidFavoriteItem);
  } catch {
    cachedFavorites = EMPTY_FAVORITES;
  }
  return cachedFavorites;
}

function getServerSnapshot(): FavoriteItem[] {
  return EMPTY_FAVORITES;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addFavorite = useCallback((item: AddFavoriteInput) => {
    const current = getSnapshot();
    const exists = current.some((f) => f.word === item.word);
    if (exists) return;

    if (current.length >= MAX_FAVORITES) {
      console.warn(`Favorites limit reached (${MAX_FAVORITES})`);
      return;
    }

    const newFavorites = [
      ...current,
      {
        word: item.word,
        reading: item.reading,
        vowels: item.vowels,
        addedAt: Date.now(),
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    window.dispatchEvent(new Event("storage"));
  }, []);

  const removeFavorite = useCallback((word: string) => {
    const current = getSnapshot();
    const newFavorites = current.filter((item) => item.word !== word);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    window.dispatchEvent(new Event("storage"));
  }, []);

  const isFavorite = useCallback(
    (word: string) => {
      return favorites.some((item) => item.word === word);
    },
    [favorites],
  );

  const exportFavorites = useCallback(() => {
    const current = getSnapshot();
    const text = current
      .map((item) => `${item.word}\t${item.reading}\t${item.vowels}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rhyme-favorites.txt";
    a.click();
    // ダウンロード完了を待ってからURLを解放
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, []);

  const clearFavorites = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("storage"));
  }, []);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    exportFavorites,
    clearFavorites,
  };
}
