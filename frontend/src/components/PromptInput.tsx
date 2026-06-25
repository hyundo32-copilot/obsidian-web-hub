"use client";

import { FormEvent, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSearch: (query: string, mode: string) => void;
  loading: boolean;
}

export default function PromptInput({ onSearch, loading }: Props) {
  const [value, setValue] = useState("");
  const [llmMode, setLlmMode] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) onSearch(q, llmMode ? "llm-summary" : "wikisearch");
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="검색어를 입력하세요…"
          className={cn(
            "flex-1 min-w-0 rounded-lg border px-3 sm:px-4 py-3 text-sm sm:text-base",
            "border-slate-300 bg-white text-slate-800 placeholder-slate-400",
            "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400",
            "disabled:opacity-50 transition-colors"
          )}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className={cn(
            "shrink-0 flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-5 py-3 text-sm font-medium text-white",
            "disabled:opacity-40 transition-all active:scale-95",
            llmMode
              ? "bg-violet-600 hover:bg-violet-500"
              : "bg-slate-800 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
          )}
        >
          {llmMode ? <Sparkles size={16} /> : <Search size={16} />}
          <span className="hidden sm:inline">
            {loading ? "처리 중…" : llmMode ? "AI 요약" : "검색"}
          </span>
        </button>
      </form>

      <div className="flex items-center gap-2 self-end">
        <span className="text-xs text-slate-500 dark:text-slate-400">AI 요약 모드</span>
        <button
          type="button"
          onClick={() => setLlmMode((v) => !v)}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            llmMode ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-600"
          )}
          aria-label="AI 요약 모드 토글"
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
              llmMode ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}
