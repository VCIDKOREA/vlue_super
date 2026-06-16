import {
  B2B_ADMIN_VERIFY_NOTICE,
  COMPANY_CONTACT_OPTIONS,
  COMPANY_CONTACT_TYPES
} from "../lib/b2bCompanyContact.js";
import {
  classifyOutboundPhone,
  isCompanyNameOnlyOutbound,
  isStaffLineOutbound,
  outboundPhoneKindLabel
} from "../lib/phoneOutboundRules.js";

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
  const repNumber = draft.masterRepNumber || "";
  const outboundKind = classifyOutboundPhone(repNumber);
  const companyOnly = isCompanyNameOnlyOutbound(repNumber);
  const staffLine = isStaffLineOutbound(repNumber);
  const companyName = String(draft.companyName || "").trim();
  const repLegalName = String(draft.representativeName || draft.vlueAuthPhoneHint || "PASS 본인인증 성명").trim();

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
          {repNumber.replace(/\D/g, "").length >= 4 ? (
            <p className="text-[10px] font-semibold text-slate-600">{outboundPhoneKindLabel(outboundKind)}</p>
          ) : null}
          <label className="block text-[10px] font-bold text-slate-600">
            상호 (송출)
            <input
              readOnly
              value={companyName}
              placeholder="회사명 입력 후 자동 반영"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px] font-bold text-slate-800"
            />
          </label>
          <label className="block text-[10px] font-bold text-slate-400">
            대표자 성명
            <input
              readOnly
              disabled
              value={repLegalName}
              className={`mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px] ${
                companyOnly
                  ? "cursor-not-allowed bg-slate-100 text-slate-400 line-through decoration-slate-400"
                  : "bg-white text-slate-700"
              }`}
            />
          </label>
          {companyOnly ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-amber-950">
              8자리 전국 대표번호는 <b>상호만</b> 송출됩니다. 대표자 성명은 수신 화면에 표시되지 않습니다.
            </p>
          ) : null}
          {staffLine ? (
            <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/80 p-2.5">
              <p className="text-[10px] font-black text-blue-950">지역번호 대표전화 — 담당자 확인 필요</p>
              <p className="text-[10px] leading-relaxed text-blue-900/90">
                재직증명서·4대보험 가입명부 등 <b>1개월 이내 발급</b> 서류 제출 후 승인됩니다. 신청 완료 시 회사 대표자 또는
                위임 계정의 <b>1회 인증</b>이 필요합니다.
              </p>
              <label className="block text-[10px] font-bold text-slate-700">
                담당자 성명
                <input
                  value={draft.masterAssigneeName || ""}
                  onChange={(e) => patch({ masterAssigneeName: e.target.value })}
                  placeholder="예: 홍길동"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]"
                />
              </label>
              <label className="block text-[10px] font-bold text-slate-700">
                담당자 직책·부서
                <input
                  value={draft.masterAssigneeTitle || ""}
                  onChange={(e) => patch({ masterAssigneeTitle: e.target.value })}
                  placeholder="예: 영업팀 과장"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]"
                />
              </label>
            </div>
          ) : null}
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
