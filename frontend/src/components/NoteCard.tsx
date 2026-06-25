"use client";

import { NoteResult } from "@/lib/api";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  note: NoteResult;
  onClick: (path: string) => void;
}

export default function NoteCard({ note, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(note.path)}
      className={cn(
        "w-full text-left rounded-xl border p-4",
        "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
        "hover:border-slate-400 hover:shadow-sm dark:hover:border-slate-500",
        "active:scale-[0.98] active:bg-slate-50 dark:active:bg-slate-700",
        "transition-all duration-150"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug">
          {note.title}
        </h3>
        <span className="shrink-0 text-xs font-mono text-slate-400 dark:text-slate-500">
          {(note.score * 100).toFixed(0)}%
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
        {note.snippet}
      </p>
      {note.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-300 dark:text-slate-600 font-mono truncate">{note.path}</p>
    </button>
  );
}
