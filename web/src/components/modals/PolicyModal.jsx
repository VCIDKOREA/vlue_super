import React from "react";
import { createPortal } from "react-dom";

export default function PolicyModal({
  open,
  onClose,
  title = "약관 및 정책",
  content,
  isDarkMode = false
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60000] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      style={{ letterSpacing: "-0.02em" }}
      onClick={onClose}
    >
      <div
        className={`relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl ${isDarkMode ? "bg-[#141722] border-white/10 text-slate-100" : "bg-white border-slate-200 text-slate-900"} transition-all`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div className={`flex items-center justify-between border-b px-6 py-4 shrink-0 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
          <h2 className="text-[17px] font-semibold tracking-tight mt-0.5">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 text-xl leading-none transition-colors ${
              isDarkMode ? "text-slate-400 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"
            }`}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="overflow-y-auto max-h-[70vh] p-4 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
          {content}
        </div>
      </div>
    </div>,
    document.body
  );
}
