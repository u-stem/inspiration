"use client";

import { useSyncExternalStore } from "react";

interface LocalStorageCache<T> {
  data: T;
  storageValue: string | null;
}

/**
 * Create a localStorage-backed state hook with useSyncExternalStore.
 * Provides efficient caching and cross-tab synchronization.
 */
export function createLocalStorageStore<T>(
  key: string,
  emptyValue: T,
  validate: (item: unknown) => item is T extends (infer U)[] ? U : never,
) {
  const cache: LocalStorageCache<T> = {
    data: emptyValue,
    storageValue: null,
  };

  function getSnapshot(): T {
    if (typeof window === "undefined") return emptyValue;

    const stored = localStorage.getItem(key);
    if (stored === cache.storageValue) {
      return cache.data;
    }

    cache.storageValue = stored;
    if (!stored) {
      cache.data = emptyValue;
      return cache.data;
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        cache.data = emptyValue;
        return cache.data;
      }
      cache.data = parsed.filter(validate) as T;
    } catch (e) {
      console.warn(`Failed to parse localStorage key "${key}":`, e);
      cache.data = emptyValue;
    }
    return cache.data;
  }

  function getServerSnapshot(): T {
    return emptyValue;
  }

  function subscribe(callback: () => void): () => void {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }

  function setData(data: T): void {
    if (Array.isArray(data) && data.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
    window.dispatchEvent(new Event("storage"));
  }

  function clear(): void {
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("storage"));
  }

  return {
    getSnapshot,
    getServerSnapshot,
    subscribe,
    setData,
    clear,
  };
}

/**
 * Hook to use a localStorage-backed store created by createLocalStorageStore.
 */
export function useLocalStorageStore<T>(store: ReturnType<typeof createLocalStorageStore<T>>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
