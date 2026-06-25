"use client";

import { useState, useEffect } from "react";
import { Share2, Clipboard, Check, X, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  content: string;
  onClose?: () => void;
}

export default function ShareButtons({ title, content, onClose }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharePressed, setSharePressed] = useState(false);

  const plainText = `# ${title}\n\n${content}`;
  const shortText = content.slice(0, 200) + (content.length > 200 ? "…" : "");

  function copyToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    }
    legacyCopy(text);
    return Promise.resolve();
  }

  function legacyCopy(text: string) {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }

  async function handleCopy() {
    await copyToClipboard(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openShare() {
    setSharePressed(true);
    setTimeout(() => setSharePressed(false), 150);
    setShowModal(true);
  }

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const kakaoUrl = `kakaotalk://send?text=${encodeURIComponent(`${title}\n\n${shortText}`)}`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${title}\n\n${shortText}`
  )}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(plainText)}`;

  const btnBase =
    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 select-none";
  const btnIdle =
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-600";

  return (
    <>
      <div className="flex gap-2">
        {/* 공유 버튼 */}
        <button
          onClick={openShare}
          className={cn(
            btnBase,
            sharePressed
              ? "scale-95 border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : btnIdle
          )}
        >
          <Share2 size={15} /> 공유
        </button>

        {/* 복사 버튼 */}
        <button
          onClick={handleCopy}
          className={cn(
            btnBase,
            copied
              ? "scale-95 border-green-500 bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              : btnIdle
          )}
        >
          {copied ? <Check size={15} /> : <Clipboard size={15} />}
          {copied ? "복사됨!" : "복사"}
        </button>

        {/* 닫기 버튼 */}
        {onClose && (
          <button onClick={onClose} className={cn(btnBase, btnIdle)}>
            <X size={15} /> 닫기
          </button>
        )}
      </div>

      {/* 공유 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-80 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">공유하기</span>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* 노트 제목 미리보기 */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">노트</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{title}</p>
            </div>

            {/* 공유 옵션 */}
            <div className="p-3 space-y-1">
              {isMobile ? (
                /* 모바일 → 카카오톡 URL 스킴 */
                <a
                  href={kakaoUrl}
                  onClick={() => setShowModal(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
                >
                  <span className="text-xl">💬</span>
                  <span>카카오톡으로 공유</span>
                </a>
              ) : (
                /* 데스크톱 → 트위터 */
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowModal(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-slate-800 dark:text-slate-200">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>트위터 / X</span>
                </a>
              )}

              <a
                href={emailUrl}
                onClick={() => setShowModal(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
              >
                <Mail size={20} className="text-orange-400" />
                <span>이메일</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
