"use client";

import { useState } from "react";
import { ingestNote } from "@/lib/api";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  queryId: string;
  query: string;
  content: string;
}

export default function IngestButton({ queryId, query, content }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleIngest() {
    setState("loading");
    const today = new Date().toISOString().slice(0, 10);
    const slug = query.slice(0, 30).replace(/\s+/g, "-").replace(/[^\w가-힣-]/g, "");
    const targetPath = `raw/inbox/${today}_${slug}`;
    const noteContent = `# ${query}\n\n${content}`;
    try {
      await ingestNote(targetPath, noteContent, ["inbox", "from-web"], queryId, true);
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button
      onClick={handleIngest}
      disabled={state === "loading"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        state === "done" && "bg-green-600 text-white",
        state === "error" && "bg-red-600 text-white",
        state === "idle" && "bg-slate-800 text-white hover:bg-slate-700",
        state === "loading" && "bg-slate-400 text-white cursor-wait"
      )}
    >
      {state === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      {{
        idle: "Vault에 저장",
        loading: "Hermes 처리 중…",
        done: "저장 완료!",
        error: "저장 실패",
      }[state]}
    </button>
  );
}
