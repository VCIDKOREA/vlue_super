import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * 멀티프로필 슬롯 결제 — body portal (관리 모달·헤더 stacking 위에).
 */
export default function MultiDccPaySheet({
  open,
  monthlyKrw = 0,
  busy = false,
  onClose,
  onConfirm
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[280] flex items-end justify-center bg-black/50 px-4 pb-10 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-dcc-pay-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <p id="multi-dcc-pay-title" className="text-[16px] font-black text-slate-900">
          프로필 슬롯 추가
        </p>
        <p className="mt-1 text-[13px] font-bold text-blue-700">
          월 {Number(monthlyKrw).toLocaleString("ko-KR")}원
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
          유료·B2B 본 요금과 별도 SKU입니다. 기본 프로필 1개는 포함되며, 추가 슬롯당 월{" "}
          {Number(monthlyKrw).toLocaleString("ko-KR")}원(할인 미적용 · SOHO 송출과 동일 단가)입니다. 결제 후 새
          프로필의 이름·사진·DCC·쇼케이스를 직접 만듭니다.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[14px] font-bold text-white disabled:opacity-60"
            onClick={() => onConfirm?.({ devBypass: import.meta.env.DEV })}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {import.meta.env.DEV ? "개발 결제 · 슬롯 열기" : "결제하고 슬롯 열기"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="w-full rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-500"
            onClick={onClose}
          >
            취소
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
