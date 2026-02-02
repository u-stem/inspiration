"use client";

import { Clock, Trash2, X } from "lucide-react";

import type { HistoryItem } from "@/types";

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (word: string) => void;
  onRemove: (word: string) => void;
  onClear: () => void;
}

export function HistoryPanel({
  history,
  onSelect,
  onRemove,
  onClear,
}: HistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Clock className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">検索履歴はありません</p>
        <p className="text-sm mt-1">検索した単語がここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-slate-800">
          検索履歴
          <span className="ml-2 text-sm font-normal text-slate-500">
            {history.length}件
          </span>
        </h3>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          すべて削除
        </button>
      </div>

      <ul className="space-y-1">
        {history.map((item) => (
          <li
            key={`${item.word}-${item.timestamp}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 group transition-colors"
          >
            <button
              onClick={() => onSelect(item.word)}
              className="flex-1 text-left text-slate-700 hover:text-blue-600 font-medium transition-colors"
            >
              {item.word}
            </button>
            <button
              onClick={() => onRemove(item.word)}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
              aria-label={`${item.word}を履歴から削除`}
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
