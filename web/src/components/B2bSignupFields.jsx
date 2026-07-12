import { useState } from "react";
import {
  buildGroupPaymentPreview,
  countGroupBillableLines,
  GROUP_SIGNUP_MIN_LINES,
  GROUP_SIGNUP_AT_REGISTRATION_NOTICE,
  B2B_ADMIN_VERIFY_NOTICE,
  syncDraftToPlannedLineCount
} from "../lib/groupSignupBm.js";
import ReferralCodeVerifyBlock, { validateReferralMetaB2b } from "./ReferralCodeVerifyBlock.jsx";
import B2bCompanyContactFields from "./B2bCompanyContactFields.jsx";
import B2bEmployeeLineSlots from "./B2bEmployeeLineSlots.jsx";
import { v1AppShell } from "../lib/v1ReleaseScope.js";

/**
 * 기업 단체 회원(B2B) — 회선 수 고정 입력 · 추천인 선택(필수 아님) · 가입 후 결제
 */
export default function B2bSignupFields({
  draft,
  onDraftChange,
  billingCycle,
  onBillingCycleChange,
  referralCode,
  onReferralCodeChange,
  onReferralMetaChange
}) {
  const [referralMeta, setReferralMeta] = useState({});
  const patch = (partial) => onDraftChange?.(syncDraftToPlannedLineCount({ ...draft, enabled: true, ...partial }));

  const lineCount = countGroupBillableLines(draft);
  const hasReferral =
    referralMeta.verified &&
    referralMeta.discountAgree &&
    !referralMeta.noReferrer &&
    Boolean(referralMeta.codeForApi);
  const preview = buildGroupPaymentPreview(billingCycle, lineCount, { hasReferral });

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
      <p className="text-[12px] font-black text-indigo-950">기업 단체 회원 (B2B)</p>
      <p className="text-[10px] leading-relaxed text-indigo-900/85">{GROUP_SIGNUP_AT_REGISTRATION_NOTICE}</p>
      {v1AppShell.referralProgram ? (
        <p className="rounded-lg border border-violet-200 bg-violet-50/90 px-2.5 py-2 text-[10px] font-semibold text-violet-950">
          추천인 코드는 선택입니다. 「추천인 없음」으로 진행할 수 있습니다. 결제는 가입·본인인증 완료 후 진행합니다.
        </p>
      ) : null}
      <p className="text-[10px] leading-relaxed text-indigo-900/90">{B2B_ADMIN_VERIFY_NOTICE}</p>

      {v1AppShell.referralProgram ? (
        <ReferralCodeVerifyBlock
          billingCycle={billingCycle}
          referralCode={referralCode}
          onReferralCodeChange={onReferralCodeChange}
          onMetaChange={(m) => {
            setReferralMeta(m);
            onReferralMetaChange?.(m);
          }}
          hidePaymentPreview
        />
      ) : null}

      <div>
        <p className="text-[11px] font-black text-slate-800">결제 주기 (가입 후 결제)</p>
        <div className="mt-1.5 flex gap-2">
          {[
            { id: "monthly", label: "월결제" },
            { id: "annual", label: "1년 구독" }
          ].map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onBillingCycleChange?.(b.id)}
              className={`flex-1 rounded-lg py-2 text-[11px] font-black ${
                billingCycle === b.id ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-[10px] font-bold text-slate-600">
        접수 회선 수 (VLUE 인증 1회선 포함, {GROUP_SIGNUP_MIN_LINES}회선 이상)
        <input
          type="number"
          min={GROUP_SIGNUP_MIN_LINES}
          max={9999}
          value={draft.plannedLineCount ?? GROUP_SIGNUP_MIN_LINES}
          onChange={(e) => {
            const planned = Math.max(GROUP_SIGNUP_MIN_LINES, Number(e.target.value) || 0);
            onDraftChange?.(
              syncDraftToPlannedLineCount({ ...draft, enabled: true, plannedLineCount: planned })
            );
          }}
          className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-2 py-2 text-[14px] font-black tabular-nums"
        />
      </label>

      <label className="block text-[10px] font-bold text-slate-600">
        상호(기업명)
        <input
          value={draft.companyName}
          onChange={(e) => patch({ companyName: e.target.value })}
          placeholder="(주)예시테크"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]"
        />
      </label>

      <B2bCompanyContactFields draft={draft} onPatch={(next) => onDraftChange?.(syncDraftToPlannedLineCount({ ...next, enabled: true }))} compact />

      <B2bEmployeeLineSlots draft={draft} onDraftChange={(next) => onDraftChange?.(syncDraftToPlannedLineCount({ ...next, enabled: true }))} />

      <div className="rounded-lg border border-indigo-100 bg-white/90 px-3 py-2">
        <p className="text-[10px] font-bold text-slate-500">예상 결제 (가입 후)</p>
        <p className="text-[16px] font-black tabular-nums text-indigo-800">{preview.amountLabel}</p>
        <p className="text-[10px] text-slate-600">{preview.detailLine}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-indigo-900/85">{preview.unitLabel}</p>
      </div>
    </div>
  );
}

export { validateReferralMetaB2b };
