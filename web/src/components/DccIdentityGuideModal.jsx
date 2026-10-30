import {
  DCC_IDENTITY_GUIDE_BODY,
  DCC_IDENTITY_GUIDE_TITLE
} from "../lib/dccIdentityGate.js";

/**
 * DCC 발급 직전 본인인증 사전 안내 팝업.
 * [인증 계속하기] → true / [취소] → false
 */
export default function DccIdentityGuideModal({ open, busy = false, onContinue, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[620] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dcc-identity-guide-title"
      onClick={() => {
        if (!busy) onCancel?.();
      }}
    >
      <div
        className="w-full max-w-[340px] rounded-[24px] border border-black/10 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="dcc-identity-guide-title" className="text-[16px] font-black tracking-tight text-slate-900">
          {DCC_IDENTITY_GUIDE_TITLE}
        </p>
        <p className="mt-3 text-[13px] font-medium leading-relaxed text-slate-600">
          {DCC_IDENTITY_GUIDE_BODY}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel?.()}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 py-3 text-[13px] font-semibold text-slate-700 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onContinue?.()}
            className="flex-[1.4] rounded-full bg-[#00D2FF] py-3 text-[13px] font-bold text-[#04121a] disabled:opacity-50"
          >
            {busy ? "준비 중…" : "인증 계속하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
