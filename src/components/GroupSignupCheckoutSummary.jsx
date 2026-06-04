import { buildGroupPaymentPreview, countGroupBillableLines, GROUP_SIGNUP_MIN_LINES } from "../lib/groupSignupBm.js";

/** 유료 가입 화면 — 가입 시 단체 요금 요약 */
export default function GroupSignupCheckoutSummary({ draft, billingCycle, onEdit }) {
  const lineCount = countGroupBillableLines(draft);
  const preview = buildGroupPaymentPreview(billingCycle, lineCount);

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-black text-indigo-950">가입 시 단체 · B2B 회선 요금</p>
          <p className="mt-0.5 text-[10px] text-indigo-900/80">
            {draft.companyName || "상호 미입력"} · 대표 {draft.masterRepNumber || "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-[10px] font-black text-indigo-800"
        >
          수정
        </button>
      </div>

      <p className="text-[10px] leading-relaxed text-indigo-900/85">
        VLUE 인증번호(본인인증 휴대폰) 1 + 추가 회선 {Math.max(0, lineCount - 1)} · 유선·휴대 등록 가능
      </p>

      <div className="rounded-lg border border-indigo-100 bg-white/90 px-3 py-2">
        <p className="text-[10px] font-bold text-slate-500">예상 결제</p>
        <p className="text-[17px] font-black tabular-nums text-indigo-800">{preview.amountLabel}</p>
        <p className="text-[10px] text-slate-600">{preview.detailLine}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {preview.badges.map((b) => (
            <span key={b} className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-800">
              {b}
            </span>
          ))}
        </div>
      </div>

      {lineCount < GROUP_SIGNUP_MIN_LINES ? (
        <p className="text-[10px] font-bold text-amber-800">
          {GROUP_SIGNUP_MIN_LINES}회선 이상 설정이 필요합니다. (현재 {lineCount}회선)
        </p>
      ) : (
        <p className="text-[10px] font-semibold text-emerald-800">
          ✓ {lineCount}회선 · 첫 결제부터 B2B 단체 요금이 적용됩니다.
        </p>
      )}
    </div>
  );
}
