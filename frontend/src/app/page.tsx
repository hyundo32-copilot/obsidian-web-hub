"use client";

import { useState } from "react";
import PromptInput from "@/components/PromptInput";
import NoteCard from "@/components/NoteCard";
import NoteDetailPanel from "@/components/NoteDetail";
import SynthesisCard from "@/components/SynthesisCard";
import ThemeToggle from "@/components/ThemeToggle";
import { queryVault, getNote, NoteDetail, QueryResponse } from "@/lib/api";
import { BookOpen } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);

  async function handleSearch(query: string, mode: string) {
    setLoading(true);
    setError(null);
    setSelectedNote(null);
    setLastQuery(query);
    try {
      const result = await queryVault(query, 10, mode);
      setQueryResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleNoteClick(path: string) {
    setNoteLoading(true);
    try {
      const note = await getNote(path);
      setSelectedNote(note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "노트를 불러올 수 없습니다.");
    } finally {
      setNoteLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <BookOpen className="text-slate-600 dark:text-slate-400 shrink-0" size={20} />
          <h1 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg flex-1">
            hyundo32의 옵시디언 웹 허브
          </h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Search */}
        <div className="flex flex-col items-center gap-4 sm:gap-6 mb-8 sm:mb-10">
          <p className="text-slate-500 dark:text-slate-400 text-sm hidden sm:block">
            볼트에서 지식을 검색하고 저장하세요
          </p>
          <PromptInput onSearch={handleSearch} loading={loading} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading note */}
        {noteLoading && (
          <div className="text-center text-slate-400 text-sm py-4">노트 불러오는 중…</div>
        )}

        {/* Results */}
        {queryResult && (
          <div>
            {queryResult.synthesis && (
              <SynthesisCard
                synthesis={queryResult.synthesis}
                query={lastQuery}
                queryId={queryResult.query_id}
              />
            )}

            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate mr-2">
                &ldquo;{lastQuery}&rdquo; 검색 결과
              </h2>
              <span className="text-xs text-slate-400 shrink-0">{queryResult.results.length}건</span>
            </div>

            {queryResult.results.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                결과가 없습니다. 다른 키워드로 검색해보세요.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {queryResult.results.map((note) => (
                  <NoteCard key={note.path} note={note} onClick={handleNoteClick} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!queryResult && !loading && !error && (
          <div className="text-center py-20 text-slate-300 dark:text-slate-600 text-sm select-none">
            검색어를 입력하면 볼트에서 노트를 찾아드립니다
          </div>
        )}
      </main>

      {/* Note detail panel */}
      {selectedNote && (
        <NoteDetailPanel
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
        />
      )}
    </div>
  );
}
