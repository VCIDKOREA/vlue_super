import {
  B2B_ADMIN_VERIFY_NOTICE,
  COMPANY_CONTACT_OPTIONS,
  COMPANY_CONTACT_TYPES
} from "../lib/b2bCompanyContact.js";

const CARRIERS = [
  { id: "LGUPLUS", label: "LG U+" },
  { id: "KT", label: "KT" }
];

/**
 * 기업 연락처 — 대표자 PASS 인증 + 고객 표시 번호(대표번호/휴대/내선)
 */
export default function B2bCompanyContactFields({ draft, onPatch, compact = false }) {
  const type = draft.companyContactType || COMPANY_CONTACT_TYPES.COMPANY_REP;
  const patch = (partial) => onPatch?.({ ...draft, ...partial });

  return (
    <div className={`space-y-2 ${compact ? "" : "rounded-xl border border-slate-200 bg-white p-3"}`}>
      {!compact ? (
        <>
          <p className="text-[12px] font-black text-slate-900">대표자 인증 · 고객 연락처</p>
          <p className="text-[10px] leading-relaxed text-slate-600">{B2B_ADMIN_VERIFY_NOTICE}</p>
        </>
      ) : null}

      <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-2.5 py-2">
        <p className="text-[10px] font-black text-indigo-950">① 대표자 VLUE 인증번호</p>
        <p className="mt-0.5 text-[10px] text-indigo-900/80">PASS 본인인증 휴대폰 · 1회선 · 변경 불가</p>
        <div className="mt-1.5 rounded-md border border-indigo-200/80 bg-white px-2 py-1.5 text-[12px] font-bold text-slate-600">
          {draft.vlueAuthPhoneHint || "본인인증 완료 후 자동 등록"}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black text-slate-800">② 고객에게 보이는 연락처</p>
        <div className="mt-1.5 space-y-1.5">
          {COMPANY_CONTACT_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer gap-2 rounded-lg border px-2.5 py-2 transition ${
                type === opt.id ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200" : "border-slate-200 bg-slate-50/80"
              }`}
            >
              <input
                type="radio"
                name="companyContactType"
                className="mt-0.5 shrink-0"
                checked={type === opt.id}
                onChange={() => patch({ companyContactType: opt.id })}
              />
              <span className="min-w-0">
                <span className="block text-[11px] font-black text-slate-900">{opt.title}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-slate-600">{opt.sub}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {type === COMPANY_CONTACT_TYPES.COMPANY_REP ? (
        <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
          <label className="block text-[10px] font-bold text-slate-600">
            회사 대표번호
            <input
              value={draft.masterRepNumber || ""}
              onChange={(e) => patch({ masterRepNumber: e.target.value })}
              placeholder="1588-0000 · 02-1234-5678"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]"
            />
          </label>
          <label className="block text-[10px] font-bold text-slate-600">
            통신사 (대표번호)
            <select
              value={draft.carrier || "LGUPLUS"}
              onChange={(e) => patch({ carrier: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] font-bold"
            >
              {CARRIERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {type === COMPANY_CONTACT_TYPES.REP_MOBILE ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-2.5 py-2 text-[10px] font-semibold text-emerald-950">
          별도 대표번호 입력 없이, PASS로 인증한 <b>대표자 휴대폰</b>이 고객 안내 번호로 사용됩니다.
        </p>
      ) : null}

      {type === COMPANY_CONTACT_TYPES.REP_EXTENSION ? (
        <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
          <label className="block text-[10px] font-bold text-slate-600">
            사옥 대표전화 (국번)
            <input
              value={draft.repExtensionMain || ""}
              onChange={(e) => patch({ repExtensionMain: e.target.value })}
              placeholder="02-1234-5678"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]"
            />
          </label>
          <label className="block text-[10px] font-bold text-slate-600">
            대표자 내선번호
            <input
              value={draft.repExtensionNo || ""}
              onChange={(e) => patch({ repExtensionNo: e.target.value })}
              placeholder="예: 101 · 8801"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
