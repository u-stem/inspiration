"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

type Popover =
  | {
      type: "new";
      top: number;
      left: number;
      startOffset: number;
      endOffset: number;
      text: string;
    }
  | {
      type: "existing";
      top: number;
      left: number;
      annotation: RhymeAnnotation;
    };

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
  onUpdateAnnotation?: (annotationId: string, color: string) => void;
}

export function AnnotatedLyrics({
  content,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
}: AnnotatedLyricsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [popover, setPopover] = useState<Popover | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const segments = buildSegments(content, annotations);

  const hasOverlap = useCallback(
    (start: number, end: number) =>
      annotations.some((a) => start < a.endOffset && end > a.startOffset),
    [annotations],
  );

  // Close popover on outside click
  useEffect(() => {
    if (!popover) return;

    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopover(null);
      }
    };

    // Delay to avoid closing immediately from the same click/mouseup
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [popover]);

  const computePosition = useCallback(
    (rect: DOMRect): { top: number; left: number } => ({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    }),
    [],
  );

  const handleMouseUp = useCallback(() => {
    if (isAnalyzing) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Resolve text nodes to their parent <span> elements which hold data-offset
    const startSpan =
      startContainer.nodeType === Node.TEXT_NODE
        ? startContainer.parentElement
        : (startContainer as HTMLElement);
    const endSpan =
      endContainer.nodeType === Node.TEXT_NODE
        ? endContainer.parentElement
        : (endContainer as HTMLElement);

    if (!startSpan?.dataset.offset || !endSpan?.dataset.offset) return;

    // Convert DOM selection offsets to content string offsets:
    // data-offset is the span's start position in content,
    // range.startOffset/endOffset is the character offset within the text node
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

    const rect = range.getBoundingClientRect();
    const pos = computePosition(rect);

    setPopover({
      type: "new",
      top: pos.top,
      left: pos.left,
      startOffset,
      endOffset,
      text: selectedText,
    });

    selection.removeAllRanges();
  }, [content, isAnalyzing, hasOverlap, computePosition]);

  const handleColorSelect = useCallback(
    async (colorId: string) => {
      if (popover?.type !== "new") return;

      setIsAnalyzing(true);
      setPopover(null);
      try {
        await onAddAnnotation(
          colorId,
          popover.startOffset,
          popover.endOffset,
          popover.text,
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [popover, onAddAnnotation],
  );

  const handleExistingClick = useCallback(
    (e: React.MouseEvent, annotation: RhymeAnnotation) => {
      // Prevent triggering mouseup handler for new selection
      e.stopPropagation();

      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const pos = computePosition(rect);

      setPopover({
        type: "existing",
        top: pos.top,
        left: pos.left,
        annotation,
      });
    },
    [computePosition],
  );

  return (
    <div className="space-y-3">
      {/* Lyrics text */}
      <div className="relative">
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
                  onClick={(e) => handleExistingClick(e, seg.annotation!)}
                  className={`${color.bg} ${color.text} rounded-sm px-0.5 cursor-pointer`}
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

        {isAnalyzing && (
          <div className="absolute top-0 right-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          </div>
        )}
      </div>

      {/* Popover (fixed to viewport to avoid overflow clipping) */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ top: popover.top, left: popover.left }}
        >
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 px-2 py-1.5">
              {popover.type === "new" && (
                <div className="flex items-center gap-1.5">
                  {RHYME_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => handleColorSelect(color.id)}
                      className={`w-5 h-5 rounded-full ${color.dot} hover:scale-110 transition-transform`}
                      title={color.id}
                    />
                  ))}
                </div>
              )}

              {popover.type === "existing" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 px-0.5">
                    <span className="font-medium truncate max-w-[120px]">
                      {popover.annotation.text}
                    </span>
                    {popover.annotation.vowelPattern && (
                      <span className="font-mono text-[10px] text-slate-400">
                        {popover.annotation.vowelPattern}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {RHYME_COLORS.map((color) => {
                      const isActive =
                        popover.annotation.color === color.id;
                      return (
                        <button
                          key={color.id}
                          onClick={() => {
                            if (!isActive && onUpdateAnnotation) {
                              onUpdateAnnotation(
                                popover.annotation.id,
                                color.id,
                              );
                            }
                            setPopover(null);
                          }}
                          className={`w-5 h-5 rounded-full ${color.dot} transition-transform ${
                            isActive
                              ? `ring-2 ring-offset-1 ${color.ring}`
                              : "hover:scale-110"
                          }`}
                          title={color.id}
                        />
                      );
                    })}
                    <div className="w-px h-4 bg-slate-200 mx-0.5" />
                    <button
                      onClick={() => {
                        onRemoveAnnotation(popover.annotation.id);
                        setPopover(null);
                      }}
                      className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="削除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Rhyme group summary */}
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
