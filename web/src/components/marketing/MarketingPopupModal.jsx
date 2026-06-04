import ModalCloseButton from "../common/ModalCloseButton";
import { dismissUntilToday, isDismissedUntilToday } from "../../lib/dismissUntilToday.js";

export function marketingPopupDismissKey(popupId) {
  return `vlue_marketing_popup_dismiss_${popupId}_v1`;
}

/** 홈 전면 마케팅 팝업 — 오늘 하루 보지 않기 */
export default function MarketingPopupModal({ popup, open, onClose, onOpenLink }) {
  if (!open || !popup) return null;

  const dismissToday = () => {
    dismissUntilToday(marketingPopupDismissKey(popup.id));
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <ModalCloseButton variant="onDark" onClick={onClose} topClassName="top-2" rightClassName="right-2" />
        <div className="relative aspect-[4/5] max-h-[62vh] w-full bg-slate-100">
          {popup.imageUrl ? (
            <img src={popup.imageUrl} alt={popup.title || "VLUE"} className="h-full w-full object-cover" />
          ) : null}
          <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white">
            VLUE
          </span>
        </div>
        <div className="p-4">
          {popup.title ? <p className="text-[15px] font-black text-slate-900">{popup.title}</p> : null}
          {popup.linkUrl ? (
            <button
              type="button"
              onClick={() => onOpenLink?.(popup)}
              className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white active:scale-[0.99]"
            >
              자세히 보기
            </button>
          ) : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={dismissToday}
              className="flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-[12px] font-bold text-white"
            >
              오늘 하루 보지 않기
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-slate-700"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowMarketingPopup(popup) {
  if (!popup?.id) return false;
  return !isDismissedUntilToday(marketingPopupDismissKey(popup.id));
}
