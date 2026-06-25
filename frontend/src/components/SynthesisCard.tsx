"use client";

import { useState } from "react";
import { Sparkles, BookmarkPlus, Check, AlertCircle } from "lucide-react";
import { ingestNote } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  synthesis: string;
  query: string;
  queryId?: string;
}

export default function SynthesisCard({ synthesis, query, queryId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleIngest() {
    setStatus("loading");
    const today = new Date().toISOString().slice(0, 10);
    const slug = query.slice(0, 40).replace(/\s+/g, "-").replace(/[^\w가-힣-]/g, "");
    const targetPath = `wiki/inbox/${today}_ai-summary_${slug}`;
    const content = `# ${query}\n\n> AI 요약 (obsidian-wiki-query)\n\n${synthesis}`;
    try {
      await ingestNote(targetPath, content, ["ai-summary", "inbox"], queryId);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-violet-500" />
          <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
            AI 요약 — &ldquo;{query}&rdquo;
          </span>
        </div>
        <button
          onClick={handleIngest}
          disabled={status === "loading"}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            status === "idle" && "bg-violet-600 text-white hover:bg-violet-500",
            status === "loading" && "bg-violet-300 text-white cursor-wait",
            status === "done" && "bg-green-500 text-white",
            status === "error" && "bg-red-500 text-white",
          )}
        >
          {status === "done" ? (
            <><Check size={13} /> 저장됨</>
          ) : status === "error" ? (
            <><AlertCircle size={13} /> 실패</>
          ) : (
            <><BookmarkPlus size={13} /> Vault 저장</>
          )}
        </button>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{synthesis}</p>
    </div>
  );
}
