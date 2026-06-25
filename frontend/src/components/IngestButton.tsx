"use client";

import { useState } from "react";
import { ingestNote } from "@/lib/api";
import { Download } from "lucide-react";
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
    const slug = query.slice(0, 30).replace(/\s+/g, "-");
    const targetPath = `wiki/inbox/${today}_${slug}`;
    const noteContent = `# ${query}\n\n${content}`;
    try {
      await ingestNote(targetPath, noteContent, ["inbox", "from-web"], queryId);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  const label = {
    idle: "Vault에 저장",
    loading: "저장 중…",
    done: "저장 완료!",
    error: "저장 실패",
  }[state];

  return (
    <button
      onClick={handleIngest}
      disabled={state === "loading"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        state === "done" && "bg-green-600 text-white",
        state === "error" && "bg-red-600 text-white",
        state === "idle" && "bg-slate-800 text-white hover:bg-slate-700",
        state === "loading" && "bg-slate-400 text-white"
      )}
    >
      <Download size={15} />
      {label}
    </button>
  );
}
