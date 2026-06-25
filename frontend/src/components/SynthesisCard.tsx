"use client";

import { Sparkles } from "lucide-react";

interface Props {
  synthesis: string;
  query: string;
}

export default function SynthesisCard({ synthesis, query }: Props) {
  return (
    <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={15} className="text-violet-500" />
        <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
          AI 요약 — &ldquo;{query}&rdquo;
        </span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{synthesis}</p>
    </div>
  );
}
