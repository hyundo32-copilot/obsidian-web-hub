"use client";

import { useState } from "react";
import { ingestRawClipboard } from "@/lib/api";

interface QuickPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickPasteModal({ isOpen, onClose }: QuickPasteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setMessage({ text: "내용을 입력해주세요.", isError: true });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await ingestRawClipboard(content, title);
      setMessage({ text: `성공적으로 저장 및 위임되었습니다! (${res.path})`, isError: false });
      setTimeout(() => {
        onClose();
        setTitle("");
        setContent("");
        setMessage(null);
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "저장에 실패했습니다.";
      setMessage({ text: errorMessage, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContent(text);
    } catch {
      setMessage({ text: "클립보드를 읽을 수 없습니다. 브라우저 권한을 확인해주세요.", isError: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">클립보드 수집 (Quick Paste)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.isError ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-green-500/20 text-green-300 border border-green-500/30"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400">제목 (옵션)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하지 않으면 자동으로 생성됩니다."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
              <label className="text-sm text-gray-400">내용</label>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                📋 클립보드에서 읽기
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="여기에 내용을 붙여넣으세요. (Cmd+V)"
              rows={8}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors resize-y"
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장 및 위임"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
