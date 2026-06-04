import ModalCloseButton from "./common/ModalCloseButton";

/** VLUE Store 입점 안내 — 팝업 + 오늘 하루 닫기 */
export default function VlueStoreNoticeModal({ open, isDarkMode = false, onClose, onDismissToday }) {
  if (!open) return null;

  const shell = isDarkMode ? "bg-[#151821] text-gray-100" : "bg-white text-gray-900";
  const textSub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const textStrong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const btnGhost = isDarkMode
    ? "border-white/15 bg-white/5 text-gray-300 hover:bg-white/10"
    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50";
  const btnPrimary = isDarkMode
    ? "bg-blue-600 text-white hover:bg-blue-500"
    : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vlue-store-notice-title"
    >
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className={`relative w-full max-w-sm rounded-2xl border p-4 pt-12 shadow-2xl ${shell} ${isDarkMode ? "border-white/10" : "border-gray-100"}`} onMouseDown={(e) => e.stopPropagation()}>
        <ModalCloseButton variant={isDarkMode ? "subtle" : "default"} onClick={onClose} />
        <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`}>
          VLUE Store
        </p>
        <h2 id="vlue-store-notice-title" className={`mt-0.5 text-[17px] font-black ${textStrong}`}>
          입점 스토어 · 공동 구매
        </h2>
        <p className={`mt-2 text-[12px] leading-relaxed ${textSub}`}>
          인증된 입점사가 상품을 등록하고, 회원이 구매·라이브 방송으로 만나는 공간입니다. 멤버십 등급·요금제는{" "}
          <b className={textStrong}>마이페이지 → 등급 업그레이드</b>에서 확인하세요.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" onClick={onDismissToday} className={`flex-1 rounded-xl px-3 py-2.5 text-[13px] font-bold ${btnPrimary}`}>
            오늘 하루 닫기
          </button>
          <button type="button" onClick={onClose} className={`flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-bold ${btnGhost}`}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
