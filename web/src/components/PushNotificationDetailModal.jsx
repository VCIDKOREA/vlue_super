import { createPortal } from "react-dom";
import { X } from "lucide-react";

const CATEGORY_STYLE = {
  가족보호: "bg-emerald-50 text-emerald-700",
  안심: "bg-emerald-50 text-emerald-700",
  앱: "bg-blue-50 text-blue-700",
  공지: "bg-indigo-50 text-indigo-700",
  기타: "bg-gray-100 text-gray-600"
};

/**
 * 알림 상세 보기 팝업 (body 포털 — 전체화면 시트 위에서도 탭 가능)
 * AppFullScreenView(z-140)·하단내비(z-150)보다 위에 둬야 함
 * 장문은 본문 영역을 스크롤해 전부 읽을 수 있음
 */
export default function PushNotificationDetailModal({
  open,
  item,
  displayTime = "",
  isDarkMode = false,
  onClose
}) {
  if (!open || !item || typeof document === "undefined") return null;

  const catStyle = CATEGORY_STYLE[item.category] || CATEGORY_STYLE.기타;
  const isRead = Boolean(item.read);

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-notif-detail-title"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(92dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl ${
          isDarkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 ${
            isDarkMode ? "border-white/10" : "border-slate-100"
          }`}
        >
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${catStyle}`}>
                {item.category || "알림"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  isRead
                    ? isDarkMode
                      ? "bg-white/10 text-slate-300"
                      : "bg-slate-100 text-slate-500"
                    : "bg-blue-600 text-white"
                }`}
              >
                {isRead ? "확인" : "미확인"}
              </span>
              {displayTime ? (
                <span className={`text-[11px] font-medium ${isDarkMode ? "text-slate-400" : "text-slate-400"}`}>
                  {displayTime}
                </span>
              ) : null}
            </div>
            <h3 id="push-notif-detail-title" className="text-[16px] font-black leading-snug tracking-tight">
              {item.title || "알림"}
            </h3>
          </div>
          <button
            type="button"
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
            }`}
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <p
            className={`whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed ${
              isDarkMode ? "text-slate-200" : "text-slate-700"
            }`}
          >
            {item.body || "내용이 없습니다."}
          </p>
        </div>
        <div
          className={`shrink-0 border-t px-4 py-3 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}
        >
          <button
            type="button"
            className="w-full rounded-xl bg-blue-600 py-3 text-[14px] font-black text-white active:scale-[0.99]"
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
