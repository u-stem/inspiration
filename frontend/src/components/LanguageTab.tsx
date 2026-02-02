"use client";

import type { SearchLanguage } from "@/types";

interface LanguageTabProps {
  language: SearchLanguage;
  onChange: (language: SearchLanguage) => void;
}

export function LanguageTab({ language, onChange }: LanguageTabProps) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
      <button
        onClick={() => onChange("ja")}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
          language === "ja"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        日本語
      </button>
      <button
        onClick={() => onChange("en")}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
          language === "en"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        English
      </button>
    </div>
  );
}
