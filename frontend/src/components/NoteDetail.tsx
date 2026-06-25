"use client";

import { NoteDetail } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ShareButtons from "./ShareButtons";
import { X } from "lucide-react";

interface Props {
  note: NoteDetail;
  onClose: () => void;
}

export default function NoteDetailPanel({ note, onClose }: Props) {
  const title = String(note.frontmatter.title ?? note.path.split("/").pop());

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-start justify-end bg-black/40">
      <div
        className={[
          "flex flex-col overflow-y-auto shadow-xl",
          "bg-white dark:bg-slate-900",
          "w-full max-h-[90vh] rounded-t-2xl",
          "sm:h-full sm:max-h-full sm:rounded-none sm:w-[480px] lg:w-[560px]",
        ].join(" ")}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-snug line-clamp-2 flex-1 mt-1 sm:mt-0">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-700">
          <ShareButtons title={title} content={note.content} onClose={onClose} />
        </div>

        {/* Backlinks */}
        {note.backlinks.length > 0 && (
          <div className="px-4 sm:px-6 py-2 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">백링크:</span>{" "}
            <span className="break-all">{note.backlinks.join(", ")}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-4 sm:px-6 py-5 prose prose-sm prose-slate dark:prose-invert max-w-none pb-safe">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
