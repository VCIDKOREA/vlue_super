import { createPortal } from "react-dom";

/** V1 유료 패키지(DCC 등) — 구독플랜 이동 확인 */
export default function V1PaidPackageGateModal({
  open,
  onClose,
  onGoSubscribe,
  isDarkMode = false
}) {
  if (!open) return null;

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-gray-200 bg-white";
  const textStrong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const textSub = isDarkMode ? "text-gray-400" : "text-gray-500";

  const content = (
    <div
      className="fixed inset-0 z-[50002] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="v1-paid-gate-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default bg-black/45"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className={`relative z-10 w-full max-w-sm rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl ${panel}`}>
        <h3 id="v1-paid-gate-title" className={`text-[16px] font-black ${textStrong}`}>
          V1유료 패키지 기능입니다.
        </h3>
        <p className={`mt-2 text-[13px] leading-relaxed ${textSub}`}>구독플랜으로 이동하시겠습니까?</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 rounded-xl py-3 text-[12px] font-black ${
              isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-700"
            }`}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onClose?.();
              onGoSubscribe?.();
            }}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-[12px] font-black text-white"
          >
            구독플랜으로 이동
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(content, document.body);
}
