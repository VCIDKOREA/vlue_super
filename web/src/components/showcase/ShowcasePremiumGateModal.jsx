import { createPortal } from "react-dom";

/** 프리미엄 전용 Showcase 기능 — 간단 안내 (추천 프로그램 UI 없음) */
export default function ShowcasePremiumGateModal({
  open,
  onClose,
  isDarkMode = false,
  onOpenUpgrade
}) {
  if (!open) return null;

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-gray-200 bg-white";
  const textStrong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const textSub = isDarkMode ? "text-gray-400" : "text-gray-500";

  const content = (
    <div
      className="fixed inset-0 z-[50001] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default bg-black/45"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className={`relative z-10 w-full max-w-sm rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl ${panel}`}>
        <h3 className={`text-[16px] font-black ${textStrong}`}>유료 멤버십 전용</h3>
        <p className={`mt-2 text-[12px] leading-relaxed ${textSub}`}>
          소셜 링크·메뉴판·상품 소개·해시태그·디지털 인증명함은 유료(가족보호중) 멤버십에서 이용할 수 있습니다.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 rounded-xl py-3 text-[12px] font-black ${
              isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-700"
            }`}
          >
            닫기
          </button>
          {onOpenUpgrade ? (
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onOpenUpgrade?.();
              }}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-[12px] font-black text-white"
            >
              멤버십 안내
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(content, document.body);
}
