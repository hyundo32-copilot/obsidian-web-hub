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
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/30">
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-4">
          <h2 className="font-bold text-slate-800 text-base truncate">
            {String(note.frontmatter.title ?? note.path.split("/").pop())}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 py-3 border-b border-slate-100">
          <ShareButtons
            title={String(note.frontmatter.title ?? note.path.split("/").pop())}
            content={note.content}
          />
        </div>

        {/* Backlinks */}
        {note.backlinks.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-100 text-xs text-slate-500">
            <span className="font-medium">백링크:</span>{" "}
            {note.backlinks.join(", ")}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-6 py-5 prose prose-sm prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
