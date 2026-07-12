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

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-notif-detail-title"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ${
          isDarkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-start justify-between gap-3 border-b px-4 py-3 ${
            isDarkMode ? "border-white/10" : "border-slate-100"
          }`}
        >
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${catStyle}`}>
                {item.category || "알림"}
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
        <div className="max-h-[min(60vh,420px)] overflow-y-auto px-4 py-4">
          <p
            className={`whitespace-pre-wrap text-[14px] font-medium leading-relaxed ${
              isDarkMode ? "text-slate-200" : "text-slate-700"
            }`}
          >
            {item.body || "내용이 없습니다."}
          </p>
        </div>
        <div className={`border-t px-4 py-3 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
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
