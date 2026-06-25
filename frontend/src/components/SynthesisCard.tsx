"use client";

import { useState } from "react";
import { Sparkles, BookmarkPlus, Check, AlertCircle, Loader2, FileText } from "lucide-react";
import { ingestNote, delegateToHermes } from "@/lib/api";

interface Props {
  synthesis: string;
  query: string;
  queryId?: string;
}

type Phase =
  | { name: "idle" }
  | { name: "uploading" }
  | { name: "uploaded"; path: string }
  | { name: "delegating"; path: string }
  | { name: "done"; path: string; hermesResult: string | null }
  | { name: "error"; message: string };

export default function SynthesisCard({ synthesis, query, queryId }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  async function handleSave() {
    setPhase({ name: "uploading" });

    const today = new Date().toISOString().slice(0, 10);
    const slug = query.slice(0, 40).replace(/\s+/g, "-").replace(/[^\w가-힣-]/g, "");
    const targetPath = `raw/inbox/${today}_ai-summary_${slug}`;
    const content = `# ${query}\n\n> AI 요약 (obsidian-wiki-query)\n\n${synthesis}`;

    let uploadedPath: string;
    try {
      const res = await ingestNote(targetPath, content, ["ai-summary", "inbox"], queryId);
      uploadedPath = res.path;
    } catch (e) {
      setPhase({ name: "error", message: e instanceof Error ? e.message : "업로드 실패" });
      return;
    }

    // 업로드 완료 확인 후 경로 표시, 내용 초기화
    setPhase({ name: "uploaded", path: uploadedPath });

    // 잠깐 대기 후 Hermes에 위임
    await new Promise((r) => setTimeout(r, 600));
    setPhase({ name: "delegating", path: uploadedPath });

    let hermesResult: string | null = null;
    try {
      const res = await delegateToHermes(uploadedPath);
      hermesResult = res.hermes_result ?? null;
    } catch {
      // Hermes 실패해도 업로드는 성공 — 결과만 null
    }

    setPhase({ name: "done", path: uploadedPath, hermesResult });
  }

  const isIdle = phase.name === "idle";
  const isBusy = phase.name === "uploading" || phase.name === "delegating";

  return (
    <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-violet-500" />
          <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
            AI 요약 — &ldquo;{query}&rdquo;
          </span>
        </div>

        {isIdle && (
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
          >
            <BookmarkPlus size={13} /> Vault 저장
          </button>
        )}
        {phase.name === "uploading" && (
          <span className="flex items-center gap-1.5 text-xs text-violet-500">
            <Loader2 size={13} className="animate-spin" /> 업로드 중…
          </span>
        )}
        {phase.name === "uploaded" && (
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <Check size={13} /> 업로드 완료
          </span>
        )}
        {phase.name === "delegating" && (
          <span className="flex items-center gap-1.5 text-xs text-violet-500">
            <Loader2 size={13} className="animate-spin" /> Hermes 처리 중…
          </span>
        )}
        {phase.name === "done" && (
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <Check size={13} /> 완료
          </span>
        )}
        {phase.name === "error" && (
          <span className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} /> {phase.message}
          </span>
        )}
      </div>

      {/* 저장 전: 요약 내용 표시 */}
      {isIdle && (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{synthesis}</p>
      )}

      {/* 저장 중/후: 내용 초기화, 경로 표시 */}
      {!isIdle && phase.name !== "error" && (
        <div className="mt-1 space-y-2">
          {(phase.name === "uploaded" ||
            phase.name === "delegating" ||
            phase.name === "done") && (
            <div className="flex items-center gap-2 rounded-lg bg-white border border-violet-100 px-3 py-2">
              <FileText size={13} className="text-violet-400 shrink-0" />
              <code className="text-xs text-slate-600 break-all">
                {(phase as { path: string }).path}.md
              </code>
            </div>
          )}

          {(phase.name === "uploading" || phase.name === "uploaded") && (
            <p className="text-xs text-slate-400">저장 중…</p>
          )}

          {phase.name === "delegating" && (
            <p className="text-xs text-slate-400">Hermes가 wiki 링크를 생성하고 있습니다…</p>
          )}

          {phase.name === "done" && phase.hermesResult && (
            <div className="rounded-lg border border-violet-100 bg-white p-3">
              <p className="text-xs font-semibold text-violet-600 mb-1">Hermes 처리 결과</p>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {phase.hermesResult}
              </p>
            </div>
          )}
          {phase.name === "done" && !phase.hermesResult && (
            <p className="text-xs text-slate-400">Hermes 처리가 완료됐습니다.</p>
          )}
        </div>
      )}

      {isBusy && (
        <div className="mt-2 h-1 rounded-full bg-violet-100 overflow-hidden">
          <div className="h-full bg-violet-400 animate-pulse w-2/3" />
        </div>
      )}
    </div>
  );
}
