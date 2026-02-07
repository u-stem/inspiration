"use client";

import {
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import type { CreativeStats, LyricsEntry } from "@/types";

interface CreativeNotesProps {
  entries: LyricsEntry[];
  stats: CreativeStats;
  onAdd: (title: string, content: string) => Promise<LyricsEntry | null>;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CreativeNotes({
  entries,
  stats,
  onAdd,
  onRemove,
  onClear,
}: CreativeNotesProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    try {
      const entry = await onAdd(title.trim(), content.trim());
      if (entry) {
        setTitle("");
        setContent("");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const topRhymes = Object.entries(stats.rhymeUsageCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleClear = () => {
    onClear();
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          歌詞を保存
        </h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          disabled={isSaving}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="歌詞を入力..."
          rows={5}
          className="w-full mt-2 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
          disabled={isSaving}
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !title.trim() || !content.trim()}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              解析中...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              保存
            </>
          )}
        </button>
      </div>

      {/* Top Rhymes */}
      {topRhymes.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            よく使う韻 TOP10
          </h3>
          <div className="flex flex-wrap gap-2">
            {topRhymes.map(([pattern, count]) => (
              <span
                key={pattern}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100"
              >
                <span className="font-mono text-xs">{pattern}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Saved Entries */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">
              保存済み ({entries.length})
            </h3>
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">全て削除しますか？</span>
                <button
                  onClick={handleClear}
                  className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                >
                  削除
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 text-xs text-slate-500 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                全てクリア
              </button>
            )}
          </div>

          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const date = new Date(entry.createdAt);
            const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="flex-1 flex items-center justify-between min-w-0 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {entry.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {dateStr} / {entry.words.length}語
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-100">
                    <pre className="mt-2 text-xs text-slate-600 whitespace-pre-wrap font-sans">
                      {entry.content}
                    </pre>
                    {entry.words.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-400 mb-1.5">抽出語</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.words.map((word, i) => (
                            <span
                              key={`${word.surface}-${i}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-50 text-slate-600 rounded border border-slate-100"
                            >
                              {word.surface}
                              {word.vowel_pattern && (
                                <span className="text-[10px] font-mono text-emerald-500">
                                  {word.vowel_pattern}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && topRhymes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <FileText className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">歌詞を保存して韻の傾向を分析しよう</p>
        </div>
      )}
    </div>
  );
}
