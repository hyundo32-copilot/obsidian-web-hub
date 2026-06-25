"use client";

import { useState } from "react";
import { Clipboard, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
}

export default function ShareButtons({ content }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
        copied
          ? "border-green-500 bg-green-50 text-green-700"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      {copied ? <Check size={15} /> : <Clipboard size={15} />}
      {copied ? "복사됨!" : "클립보드 복사"}
    </button>
  );
}
