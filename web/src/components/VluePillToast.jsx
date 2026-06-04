/** 하단 알약 토스트 — 다크모드 해제 안내와 동일 스타일 */
export const VLUE_PILL_TOAST_INNER =
  "mx-auto w-fit max-w-[min(100%,22rem)] rounded-full bg-[#121212] px-5 py-2.5 text-center text-[12px] font-bold leading-snug text-white shadow-[0_8px_24px_rgba(0,0,0,0.38)] ring-1 ring-black/15";

export default function VluePillToast({ message, className = "", bottomClassName = "", onTap }) {
  if (!message) return null;
  const interactive = Boolean(onTap);
  return (
    <div
      className={`fixed inset-x-0 z-[230] flex justify-center px-4 ${bottomClassName} ${className} ${
        interactive ? "pointer-events-auto" : "pointer-events-none"
      }`}
      role="status"
      aria-live="polite"
    >
      {interactive ? (
        <button type="button" className={VLUE_PILL_TOAST_INNER} onClick={onTap}>
          {message}
        </button>
      ) : (
        <p className={VLUE_PILL_TOAST_INNER}>{message}</p>
      )}
    </div>
  );
}
