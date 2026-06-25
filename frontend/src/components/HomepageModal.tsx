"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Home } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function HomepageModal({ onClose }: Props) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  function copyToClipboard() {
    const el = document.createElement("textarea");
    el.value = url;
    el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const steps = [
    {
      browser: "Chrome",
      icon: "🌐",
      steps: ["우측 상단 ⋮ → 설정", "시작 그룹 → '특정 페이지 열기'", "위 주소 붙여넣기"],
    },
    {
      browser: "Safari",
      icon: "🧭",
      steps: ["Safari → 환경설정 → 일반", "'홈페이지' 칸에 위 주소 붙여넣기"],
    },
    {
      browser: "Samsung Internet",
      icon: "📱",
      steps: ["⋮ → 설정 → 홈페이지", "'특정 페이지' 선택 후 위 주소 입력"],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Home size={16} className="text-slate-600 dark:text-slate-300" />
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              시작 페이지로 설정
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* URL 복사 */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              아래 주소를 복사해 브라우저 시작 페이지에 붙여넣으세요.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2">
                <p className="text-sm font-mono text-slate-700 dark:text-slate-200 truncate">{url}</p>
              </div>
              <button
                onClick={copyToClipboard}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all active:scale-95"
                style={copied
                  ? { borderColor: "#22c55e", background: "#f0fdf4", color: "#15803d" }
                  : { borderColor: "#cbd5e1", background: "white", color: "#374151" }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>

          {/* 브라우저별 안내 */}
          <div className="space-y-3">
            {steps.map((b) => (
              <div key={b.browser} className="rounded-xl border border-slate-100 dark:border-slate-700 p-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  {b.icon} {b.browser}
                </p>
                <ol className="space-y-0.5">
                  {b.steps.map((s, i) => (
                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex gap-1.5">
                      <span className="text-slate-300 dark:text-slate-600 shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
