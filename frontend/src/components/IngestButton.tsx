"use client";

import { useState } from "react";
import { ingestNote, delegateToHermes } from "@/lib/api";
import { Download, Loader2, Check, AlertCircle, FileText } from "lucide-react";

interface Props {
  queryId: string;
  query: string;
  content: string;
}

type Phase =
  | { name: "idle" }
  | { name: "uploading" }
  | { name: "uploaded"; path: string }
  | { name: "delegating"; path: string }
  | { name: "done"; path: string }
  | { name: "error" };

export default function IngestButton({ queryId, query, content }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  async function handleSave() {
    setPhase({ name: "uploading" });

    const today = new Date().toISOString().slice(0, 10);
    const slug = query.slice(0, 30).replace(/\s+/g, "-").replace(/[^\w가-힣-]/g, "");
    const targetPath = `raw/inbox/${today}_${slug}`;
    const noteContent = `# ${query}\n\n${content}`;

    let uploadedPath: string;
    try {
      const res = await ingestNote(targetPath, noteContent, ["inbox", "from-web"], queryId);
      uploadedPath = res.path;
    } catch {
      setPhase({ name: "error" });
      setTimeout(() => setPhase({ name: "idle" }), 2000);
      return;
    }

    setPhase({ name: "uploaded", path: uploadedPath });
    await new Promise((r) => setTimeout(r, 600));

    setPhase({ name: "delegating", path: uploadedPath });
    try {
      await delegateToHermes(uploadedPath);
    } catch {
      // 업로드는 성공 — Hermes 실패는 무시
    }

    setPhase({ name: "done", path: uploadedPath });
  }

  if (phase.name === "idle") {
    return (
      <button
        onClick={handleSave}
        className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
      >
        <Download size={15} /> Vault에 저장
      </button>
    );
  }

  if (phase.name === "uploading") {
    return (
      <span className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={15} className="animate-spin" /> 업로드 중…
      </span>
    );
  }

  if (phase.name === "delegating") {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5">
          <FileText size={13} className="text-slate-400 shrink-0" />
          <code className="text-xs text-slate-500 break-all">{phase.path}.md</code>
        </div>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 size={12} className="animate-spin" /> Hermes 처리 중…
        </span>
      </div>
    );
  }

  if (phase.name === "done") {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5">
          <FileText size={13} className="text-green-500 shrink-0" />
          <code className="text-xs text-slate-600 break-all">{phase.path}.md</code>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <Check size={12} /> 저장 완료
        </span>
      </div>
    );
  }

  if (phase.name === "uploaded") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5">
        <FileText size={13} className="text-slate-400 shrink-0" />
        <code className="text-xs text-slate-500 break-all">{phase.path}.md</code>
      </div>
    );
  }

  // error
  return (
    <span className="flex items-center gap-2 text-sm text-red-500">
      <AlertCircle size={15} /> 저장 실패
    </span>
  );
}
