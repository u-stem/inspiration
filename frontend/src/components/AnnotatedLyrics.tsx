"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import type { RhymeAnnotation } from "@/types";

export const RHYME_COLORS = [
  {
    id: "red",
    bg: "bg-red-100",
    text: "text-red-700",
    ring: "ring-red-400",
    dot: "bg-red-400",
  },
  {
    id: "blue",
    bg: "bg-blue-100",
    text: "text-blue-700",
    ring: "ring-blue-400",
    dot: "bg-blue-400",
  },
  {
    id: "green",
    bg: "bg-green-100",
    text: "text-green-700",
    ring: "ring-green-400",
    dot: "bg-green-400",
  },
  {
    id: "amber",
    bg: "bg-amber-100",
    text: "text-amber-700",
    ring: "ring-amber-400",
    dot: "bg-amber-400",
  },
  {
    id: "purple",
    bg: "bg-purple-100",
    text: "text-purple-700",
    ring: "ring-purple-400",
    dot: "bg-purple-400",
  },
  {
    id: "pink",
    bg: "bg-pink-100",
    text: "text-pink-700",
    ring: "ring-pink-400",
    dot: "bg-pink-400",
  },
] as const;

type RhymeColor = (typeof RHYME_COLORS)[number];

function getColorConfig(colorId: string): RhymeColor {
  return RHYME_COLORS.find((c) => c.id === colorId) ?? RHYME_COLORS[0];
}

interface Segment {
  start: number;
  end: number;
  text: string;
  annotation?: RhymeAnnotation;
}

function buildSegments(
  content: string,
  annotations: RhymeAnnotation[],
): Segment[] {
  if (annotations.length === 0) {
    return [{ start: 0, end: content.length, text: content }];
  }

  const sorted = [...annotations].sort(
    (a, b) => a.startOffset - b.startOffset,
  );
  const segments: Segment[] = [];
  let cursor = 0;

  for (const ann of sorted) {
    if (ann.startOffset > cursor) {
      segments.push({
        start: cursor,
        end: ann.startOffset,
        text: content.slice(cursor, ann.startOffset),
      });
    }
    segments.push({
      start: ann.startOffset,
      end: ann.endOffset,
      text: content.slice(ann.startOffset, ann.endOffset),
      annotation: ann,
    });
    cursor = ann.endOffset;
  }

  if (cursor < content.length) {
    segments.push({
      start: cursor,
      end: content.length,
      text: content.slice(cursor),
    });
  }

  return segments;
}

interface AnnotatedLyricsProps {
  content: string;
  annotations: RhymeAnnotation[];
  onAddAnnotation: (
    color: string,
    startOffset: number,
    endOffset: number,
    text: string,
  ) => Promise<RhymeAnnotation | null>;
  onRemoveAnnotation: (annotationId: string) => void;
}

export function AnnotatedLyrics({
  content,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
}: AnnotatedLyricsProps) {
  const [selectedColor, setSelectedColor] = useState<string>(
    RHYME_COLORS[0].id,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(
    null,
  );
  const contentRef = useRef<HTMLDivElement>(null);

  const segments = buildSegments(content, annotations);

  const hasOverlap = useCallback(
    (start: number, end: number) =>
      annotations.some((a) => start < a.endOffset && end > a.startOffset),
    [annotations],
  );

  const handleMouseUp = useCallback(async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || isAnalyzing) return;

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    const startSpan =
      startContainer.nodeType === Node.TEXT_NODE
        ? startContainer.parentElement
        : (startContainer as HTMLElement);
    const endSpan =
      endContainer.nodeType === Node.TEXT_NODE
        ? endContainer.parentElement
        : (endContainer as HTMLElement);

    if (!startSpan?.dataset.offset || !endSpan?.dataset.offset) return;

    const startOffset =
      parseInt(startSpan.dataset.offset, 10) + range.startOffset;
    const endOffset = parseInt(endSpan.dataset.offset, 10) + range.endOffset;

    if (startOffset >= endOffset) return;
    if (hasOverlap(startOffset, endOffset)) {
      selection.removeAllRanges();
      return;
    }

    const selectedText = content.slice(startOffset, endOffset);
    if (!selectedText.trim()) {
      selection.removeAllRanges();
      return;
    }

    setIsAnalyzing(true);
    try {
      await onAddAnnotation(selectedColor, startOffset, endOffset, selectedText);
    } finally {
      setIsAnalyzing(false);
      selection.removeAllRanges();
    }
  }, [content, selectedColor, isAnalyzing, hasOverlap, onAddAnnotation]);

  return (
    <div className="space-y-3">
      {/* カラーパレット */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">韻の色:</span>
        {RHYME_COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => setSelectedColor(color.id)}
            className={`w-5 h-5 rounded-full ${color.dot} transition-all ${
              selectedColor === color.id
                ? `ring-2 ring-offset-1 ${color.ring}`
                : "opacity-50 hover:opacity-75"
            }`}
            title={color.id}
          />
        ))}
        {isAnalyzing && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
        )}
      </div>

      {/* 歌詞テキスト */}
      <div
        ref={contentRef}
        onMouseUp={handleMouseUp}
        className="text-sm leading-relaxed whitespace-pre-wrap select-text cursor-text font-sans text-slate-700"
      >
        {segments.map((seg) => {
          if (seg.annotation) {
            const color = getColorConfig(seg.annotation.color);
            return (
              <span
                key={seg.annotation.id}
                data-offset={seg.start}
                onClick={() =>
                  setSelectedAnnotation(
                    selectedAnnotation === seg.annotation!.id
                      ? null
                      : seg.annotation!.id,
                  )
                }
                className={`${color.bg} ${color.text} rounded-sm px-0.5 cursor-pointer ${
                  selectedAnnotation === seg.annotation.id
                    ? `ring-1 ${color.ring}`
                    : ""
                }`}
              >
                {seg.text}
              </span>
            );
          }
          return (
            <span key={`plain-${seg.start}`} data-offset={seg.start}>
              {seg.text}
            </span>
          );
        })}
      </div>

      {/* 選択中アノテーションの詳細 */}
      {selectedAnnotation &&
        (() => {
          const ann = annotations.find((a) => a.id === selectedAnnotation);
          if (!ann) return null;
          const color = getColorConfig(ann.color);
          return (
            <div
              className={`flex items-center gap-2 text-xs ${color.bg} ${color.text} px-2 py-1.5 rounded-lg`}
            >
              <span className="font-medium">{ann.text}</span>
              <span className="font-mono text-[10px] opacity-75">
                {ann.vowelPattern}
              </span>
              <button
                onClick={() => {
                  onRemoveAnnotation(ann.id);
                  setSelectedAnnotation(null);
                }}
                className="ml-auto p-0.5 hover:bg-white/50 rounded transition-colors"
                title="削除"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })()}

      {/* 韻グループサマリー */}
      {annotations.length > 0 && (
        <RhymeGroupSummary annotations={annotations} />
      )}
    </div>
  );
}

function RhymeGroupSummary({
  annotations,
}: {
  annotations: RhymeAnnotation[];
}) {
  const groups = new Map<string, RhymeAnnotation[]>();
  for (const ann of annotations) {
    const group = groups.get(ann.color) ?? [];
    group.push(ann);
    groups.set(ann.color, group);
  }

  const rhymeGroups = [...groups.entries()].filter(
    ([, anns]) => anns.length >= 2,
  );

  if (rhymeGroups.length === 0) return null;

  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="text-xs text-slate-400 mb-2">韻グループ</p>
      <div className="space-y-1.5">
        {rhymeGroups.map(([colorId, anns]) => {
          const color = getColorConfig(colorId);
          return (
            <div key={colorId} className="flex items-start gap-2 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${color.dot} mt-0.5 shrink-0`}
              />
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {anns.map((ann) => (
                  <span key={ann.id} className="text-slate-600">
                    {ann.text}
                    <span className="font-mono text-[10px] text-slate-400 ml-0.5">
                      ({ann.vowelPattern})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
