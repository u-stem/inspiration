"use client";

import type { Phoneme } from "@/types";

interface PhonemeDisplayProps {
  phonemes: Phoneme[];
  fixConsonants?: boolean[];
  fixVowels?: boolean[];
  onToggleConsonant?: (index: number) => void;
  onToggleVowel?: (index: number) => void;
  interactive?: boolean;
}

function getHiragana(phoneme: Phoneme): string {
  const { consonant, vowel } = phoneme;

  const MORA_MAP: Record<string, Record<string, string>> = {
    "": { a: "あ", i: "い", u: "う", e: "え", o: "お", n: "ん" },
    k: { a: "か", i: "き", u: "く", e: "け", o: "こ" },
    g: { a: "が", i: "ぎ", u: "ぐ", e: "げ", o: "ご" },
    s: { a: "さ", i: "し", u: "す", e: "せ", o: "そ" },
    z: { a: "ざ", i: "じ", u: "ず", e: "ぜ", o: "ぞ" },
    t: { a: "た", i: "ち", u: "つ", e: "て", o: "と" },
    d: { a: "だ", i: "ぢ", u: "づ", e: "で", o: "ど" },
    n: { a: "な", i: "に", u: "ぬ", e: "ね", o: "の" },
    h: { a: "は", i: "ひ", u: "ふ", e: "へ", o: "ほ" },
    b: { a: "ば", i: "び", u: "ぶ", e: "べ", o: "ぼ" },
    p: { a: "ぱ", i: "ぴ", u: "ぷ", e: "ぺ", o: "ぽ" },
    m: { a: "ま", i: "み", u: "む", e: "め", o: "も" },
    y: { a: "や", u: "ゆ", o: "よ" },
    r: { a: "ら", i: "り", u: "る", e: "れ", o: "ろ" },
    w: { a: "わ", o: "を" },
    sh: { i: "し" },
    ch: { i: "ち" },
    ts: { u: "つ" },
    f: { u: "ふ" },
    j: { i: "じ" },
    N: { n: "ん" },
  };

  const consonantMap = MORA_MAP[consonant];
  if (consonantMap) {
    return consonantMap[vowel] || `${consonant}${vowel}`;
  }
  return `${consonant}${vowel}`;
}

export function PhonemeDisplay({
  phonemes,
  fixConsonants,
  fixVowels,
  onToggleConsonant,
  onToggleVowel,
  interactive = false,
}: PhonemeDisplayProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {phonemes.map((phoneme, index) => {
        const hiragana = getHiragana(phoneme);
        const consonantFixed = fixConsonants?.[index] ?? true;
        const vowelFixed = fixVowels?.[index] ?? true;

        return (
          <div
            key={index}
            className="flex flex-col items-center bg-slate-50 rounded-lg p-2 min-w-[60px]"
          >
            <span className="text-lg font-medium text-slate-800 mb-1">
              {hiragana}
            </span>
            <div className="flex gap-1 text-xs">
              {interactive ? (
                <>
                  <button
                    onClick={() => onToggleConsonant?.(index)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      consonantFixed
                        ? "bg-blue-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                    title={consonantFixed ? "子音: 固定" : "子音: 任意"}
                  >
                    {phoneme.consonant || "-"}
                  </button>
                  <button
                    onClick={() => onToggleVowel?.(index)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      vowelFixed
                        ? "bg-green-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                    title={vowelFixed ? "母音: 固定" : "母音: 任意"}
                  >
                    {phoneme.vowel}
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      consonantFixed
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {phoneme.consonant || "-"}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      vowelFixed
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {phoneme.vowel}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
