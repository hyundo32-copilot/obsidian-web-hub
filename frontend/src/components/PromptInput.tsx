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
          placeholder="볼트에서 검색할 내용을 입력하세요…"
          className={cn(
            "flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-slate-500",
            "disabled:opacity-50"
          )}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className={cn(
            "flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white",
            "disabled:opacity-40 transition-colors",
            llmMode ? "bg-violet-600 hover:bg-violet-500" : "bg-slate-800 hover:bg-slate-700"
          )}
        >
          {llmMode ? <Sparkles size={16} /> : <Search size={16} />}
          {loading ? "처리 중…" : llmMode ? "AI 요약" : "검색"}
        </button>
      </form>
      <div className="flex items-center gap-2 self-end">
        <span className="text-xs text-slate-500">AI 요약 모드</span>
        <button
          type="button"
          onClick={() => setLlmMode((v) => !v)}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            llmMode ? "bg-violet-500" : "bg-slate-300"
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
