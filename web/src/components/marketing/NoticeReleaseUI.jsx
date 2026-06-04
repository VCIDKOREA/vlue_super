/** SSE·홈 진입 시 공지 상단 토스트 + 상세 레이어 */
export function NoticeReleaseToast({ message, open, onTap, onDismiss }) {
  if (!open) return null;
  return (
    <button
      type="button"
      onClick={onTap}
      className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-[215] w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-left shadow-lg ring-1 ring-blue-50 transition-all duration-300 active:scale-[0.99]"
    >
      <p className="text-[13px] font-black text-blue-700">{message || "📢 새로운 시스템 업데이트가 배포되었습니다!"}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">탭하여 공지 내용 보기</p>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            onDismiss?.();
          }
        }}
        className="absolute right-2 top-2 rounded-lg px-2 py-1 text-[14px] text-slate-400"
        aria-label="닫기"
      >
        ×
      </span>
    </button>
  );
}

export default function NoticeDetailSheet({ notice, open, onClose }) {
  if (!open || !notice) return null;

  return (
    <div
      className="fixed inset-0 z-[225] flex items-end justify-center bg-black/45 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl border border-slate-100 bg-white p-5 shadow-2xl transition-all duration-300 sm:rounded-3xl">
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">시스템 업데이트</p>
        <h2 className="mt-1 text-[18px] font-black text-slate-900">{notice.title}</h2>
        {notice.highlightText ? (
          <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-[13px] font-bold text-blue-800">{notice.highlightText}</p>
        ) : null}
        <div className="mt-3 max-h-[45vh] overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
          {notice.bodyText}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}
