import ModalCloseButton from "../common/ModalCloseButton";

/**
 * 모바일 게스트가 보호된 기능을 시도할 때 표시하는 신원 인증 안내 모달.
 */
export default function IdentityVerificationModal({
  open,
  onClose,
  onStartVerification,
  onLogin
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/45 px-5 backdrop-blur-sm"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-blue-100 bg-white p-6 pt-12 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="identity-verification-title"
      >
        <ModalCloseButton variant="default" onClick={onClose} />

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 text-blue-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 id="identity-verification-title" className="text-center text-[16px] font-black text-slate-900">
          신원 인증이 필요합니다
        </h2>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-slate-600">
          이 기능을 이용하려면 신원 인증이 필요합니다.
          <br />
          VLUE 인증을 시작하시겠습니까?
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onStartVerification}
            className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white shadow-md shadow-blue-200 active:scale-[0.98] transition-transform"
          >
            VLUE 인증 시작
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-[13px] font-bold text-slate-700 active:scale-[0.98] transition-transform"
          >
            이미 계정이 있어요 · 로그인
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-[12px] font-semibold text-slate-500"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
