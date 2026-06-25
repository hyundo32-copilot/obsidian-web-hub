"use client";

import { useState } from "react";
import { Sparkles, BookmarkPlus, Check, AlertCircle, Loader2 } from "lucide-react";
import { ingestNote } from "@/lib/api";

interface Props {
  synthesis: string;
  query: string;
  queryId?: string;
}

export default function SynthesisCard({ synthesis, query, queryId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [hermesResult, setHermesResult] = useState<string | null>(null);

  async function handleIngest() {
    setStatus("loading");
    setHermesResult(null);
    const today = new Date().toISOString().slice(0, 10);
    const slug = query.slice(0, 40).replace(/\s+/g, "-").replace(/[^\w가-힣-]/g, "");
    const targetPath = `wiki/raw/${today}_ai-summary_${slug}`;
    const content = `# ${query}\n\n> AI 요약 (obsidian-wiki-query)\n\n${synthesis}`;
    try {
      const res = await ingestNote(targetPath, content, ["ai-summary", "raw"], queryId, true);
      setHermesResult(res.hermes_result ?? null);
      setStatus("done");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
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
        {status === "idle" && (
          <button
            onClick={handleIngest}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
          >
            <BookmarkPlus size={13} /> Vault 저장
          </button>
        )}
        {status === "loading" && (
          <span className="flex items-center gap-1.5 text-xs text-violet-500">
            <Loader2 size={13} className="animate-spin" /> Hermes 처리 중…
          </span>
        )}
        {status === "done" && (
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <Check size={13} /> 저장 완료
          </span>
        )}
        {status === "error" && (
          <span className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} /> 저장 실패
          </span>
        )}
      </div>

      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{synthesis}</p>

      {hermesResult && (
        <div className="mt-3 rounded-lg border border-violet-100 bg-white p-3">
          <p className="text-xs font-semibold text-violet-600 mb-1">Hermes 처리 결과</p>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{hermesResult}</p>
        </div>
      )}
    </div>
  );
}
