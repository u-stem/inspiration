"use client";

import { Check, Copy, ExternalLink, Heart } from "lucide-react";
import { useState } from "react";

import type { PatternRhymeResult } from "@/types";

type RubyFormat = "katakana" | "half-katakana" | "hiragana";

function toHalfWidthKatakana(str: string): string {
  const map: Record<string, string> = {
    ア: "ｱ", イ: "ｲ", ウ: "ｳ", エ: "ｴ", オ: "ｵ",
    カ: "ｶ", キ: "ｷ", ク: "ｸ", ケ: "ｹ", コ: "ｺ",
    サ: "ｻ", シ: "ｼ", ス: "ｽ", セ: "ｾ", ソ: "ｿ",
    タ: "ﾀ", チ: "ﾁ", ツ: "ﾂ", テ: "ﾃ", ト: "ﾄ",
    ナ: "ﾅ", ニ: "ﾆ", ヌ: "ﾇ", ネ: "ﾈ", ノ: "ﾉ",
    ハ: "ﾊ", ヒ: "ﾋ", フ: "ﾌ", ヘ: "ﾍ", ホ: "ﾎ",
    マ: "ﾏ", ミ: "ﾐ", ム: "ﾑ", メ: "ﾒ", モ: "ﾓ",
    ヤ: "ﾔ", ユ: "ﾕ", ヨ: "ﾖ",
    ラ: "ﾗ", リ: "ﾘ", ル: "ﾙ", レ: "ﾚ", ロ: "ﾛ",
    ワ: "ﾜ", ヲ: "ｦ", ン: "ﾝ",
    ァ: "ｧ", ィ: "ｨ", ゥ: "ｩ", ェ: "ｪ", ォ: "ｫ",
    ッ: "ｯ", ャ: "ｬ", ュ: "ｭ", ョ: "ｮ",
    ガ: "ｶﾞ", ギ: "ｷﾞ", グ: "ｸﾞ", ゲ: "ｹﾞ", ゴ: "ｺﾞ",
    ザ: "ｻﾞ", ジ: "ｼﾞ", ズ: "ｽﾞ", ゼ: "ｾﾞ", ゾ: "ｿﾞ",
    ダ: "ﾀﾞ", ヂ: "ﾁﾞ", ヅ: "ﾂﾞ", デ: "ﾃﾞ", ド: "ﾄﾞ",
    バ: "ﾊﾞ", ビ: "ﾋﾞ", ブ: "ﾌﾞ", ベ: "ﾍﾞ", ボ: "ﾎﾞ",
    パ: "ﾊﾟ", ピ: "ﾋﾟ", プ: "ﾌﾟ", ペ: "ﾍﾟ", ポ: "ﾎﾟ",
    ー: "ｰ",
  };
  return str.split("").map((c) => map[c] || c).join("");
}

function formatWithRuby(word: string, reading: string, format: RubyFormat): string {
  let rubyReading = reading;
  if (format === "katakana") {
    rubyReading = reading.replace(/[\u3041-\u3096]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) + 0x60)
    );
  } else if (format === "half-katakana") {
    const katakana = reading.replace(/[\u3041-\u3096]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) + 0x60)
    );
    rubyReading = toHalfWidthKatakana(katakana);
  }
  return `${word}(${rubyReading})`;
}

interface ResultCardProps {
  result: PatternRhymeResult;
  rubyFormat: RubyFormat;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onWordClick: (word: string, reading: string) => void;
}

export function ResultCard({
  result,
  rubyFormat,
  isFavorite,
  onToggleFavorite,
  onWordClick,
}: ResultCardProps) {
  const [copied, setCopied] = useState<"word" | "ruby" | null>(null);

  const copyToClipboard = async (text: string, type: "word" | "ruby") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCopyWord = () => {
    copyToClipboard(result.word, "word");
  };

  const handleCopyWithRuby = () => {
    const text = formatWithRuby(result.word, result.reading, rubyFormat);
    copyToClipboard(text, "ruby");
  };

  const handleWebSearch = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(result.word)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-3 bg-white rounded-lg border border-slate-200">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <button
            onClick={() => onWordClick(result.word, result.reading)}
            className="text-base font-bold text-slate-800 break-all hover:text-blue-600 hover:underline transition-colors text-left"
            title="この単語で検索"
          >
            {result.word}
          </button>
          <p className="text-xs text-slate-500">{result.reading}</p>
        </div>
        <button
          onClick={onToggleFavorite}
          className={`shrink-0 p-1.5 rounded-full transition-colors ${
            isFavorite
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-slate-300 hover:text-red-500 hover:bg-slate-50"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {result.consonant_pattern && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-blue-50 text-blue-600 rounded">
            {result.consonant_pattern}
          </span>
        )}
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-600 rounded">
          {result.vowel_pattern}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded">
          {result.mora_count}音
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${result.score}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-slate-400 w-8 text-right">
          {result.score}%
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1">
        <button
          onClick={handleCopyWord}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
          title="コピー"
        >
          {copied === "word" ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>コピー</span>
        </button>

        <button
          onClick={handleCopyWithRuby}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
          title="ルビ付きコピー"
        >
          {copied === "ruby" ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>ルビ付きコピー</span>
        </button>

        <button
          onClick={handleWebSearch}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors ml-auto"
          title="Web検索"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>検索</span>
        </button>
      </div>
    </div>
  );
}
