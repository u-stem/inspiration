"use client";

import { Download, Heart, Trash2, X } from "lucide-react";

import type { FavoriteItem } from "@/types";

interface FavoritesPanelProps {
  favorites: FavoriteItem[];
  onRemove: (word: string) => void;
  onExport: () => void;
  onClear: () => void;
}

export function FavoritesPanel({
  favorites,
  onRemove,
  onExport,
  onClear,
}: FavoritesPanelProps) {
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Heart className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">お気に入りはありません</p>
        <p className="text-sm mt-1">検索結果からハートをクリックして追加</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-slate-800">
          お気に入り
          <span className="ml-2 text-sm font-normal text-slate-500">
            {favorites.length}件
          </span>
        </h3>
        <div className="flex gap-1">
          <button
            onClick={onExport}
            className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="お気に入りをエクスポート"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="お気に入りをすべて削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {favorites.map((item) => (
          <li
            key={item.word}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{item.word}</span>
                <span className="text-sm text-slate-500">({item.reading})</span>
              </div>
              <span className="text-xs font-mono text-blue-600">
                {item.vowels}
              </span>
            </div>
            <button
              onClick={() => onRemove(item.word)}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
              aria-label={`${item.word}をお気に入りから削除`}
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
