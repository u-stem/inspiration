"use client";

import { useCallback } from "react";

import type { FavoriteItem } from "@/types";

import { createLocalStorageStore, useLocalStorageStore } from "./useLocalStorage";

const STORAGE_KEY = "rhyme-favorites";
const MAX_FAVORITES = 500;
const EMPTY_FAVORITES: FavoriteItem[] = [];

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

const favoritesStore = createLocalStorageStore<FavoriteItem[]>(
  STORAGE_KEY,
  EMPTY_FAVORITES,
  isValidFavoriteItem,
);

export function useFavorites() {
  const favorites = useLocalStorageStore(favoritesStore);

  const addFavorite = useCallback((item: AddFavoriteInput) => {
    const current = favoritesStore.getSnapshot();
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

    favoritesStore.setData(newFavorites);
  }, []);

  const removeFavorite = useCallback((word: string) => {
    const current = favoritesStore.getSnapshot();
    const newFavorites = current.filter((item) => item.word !== word);
    favoritesStore.setData(newFavorites);
  }, []);

  const isFavorite = useCallback(
    (word: string) => {
      return favorites.some((item) => item.word === word);
    },
    [favorites],
  );

  const exportFavorites = useCallback(() => {
    const current = favoritesStore.getSnapshot();
    const text = current.map((item) => `${item.word}\t${item.reading}\t${item.vowels}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rhyme-favorites.txt";
    a.click();
    // Wait for download to complete before revoking URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const clearFavorites = useCallback(() => {
    favoritesStore.clear();
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
