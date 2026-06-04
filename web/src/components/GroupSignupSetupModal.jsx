import { useEffect, useMemo, useState } from "react";
import {
  buildGroupPaymentPreview,
  countGroupBillableLines,
  GROUP_SIGNUP_AT_REGISTRATION_NOTICE,
  GROUP_SIGNUP_MIN_LINES,
  INDIVIDUAL_TO_GROUP_CONVERSION_NOTICE,
  validateGroupSignupDraft
} from "../lib/groupSignupBm.js";
import B2bCompanyContactFields from "./B2bCompanyContactFields.jsx";

function newLineId() {
  return `gl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** kind `extension` = 지역번호 포함 유선(02·031 등), 사내 단축 내선 아님 */
function emptyLandlineLine() {
  return {
    id: newLineId(),
    kind: "extension",
    phone: "",
    assigneeName: "",
    assigneeTitle: ""
  };
}

/**
 * 유료 가입 — 단체 10회선+ 설정 (가입 시 B2B 요금 확정)
 */
export default function GroupSignupSetupModal({
  open,
  onClose,
  draft,
  onSave,
  billingCycle = "monthly"
}) {
  const [local, setLocal] = useState(draft);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) setLocal(draft);
  }, [open, draft]);

  const lineCount = useMemo(() => countGroupBillableLines(local), [local]);
  const preview = useMemo(
    () => buildGroupPaymentPreview(billingCycle, lineCount),
    [billingCycle, lineCount]
  );

  if (!open) return null;

  const patch = (partial) => setLocal((d) => ({ ...d, ...partial }));

  const addLine = (kind) => {
    setLocal((d) => ({
      ...d,
      lines: [
        ...(d.lines || []),
        kind === "mobile"
          ? {
              id: newLineId(),
              kind: "mobile",
              phone: "",
              assigneeName: "",
              assigneeTitle: ""
            }
          : emptyLandlineLine()
      ]
    }));
  };

  const updateLine = (id, field, value) => {
    setLocal((d) => ({
      ...d,
      lines: (d.lines || []).map((row) => (row.id === id ? { ...row, [field]: value } : row))
    }));
  };

  const removeLine = (id) => {
    setLocal((d) => ({ ...d, lines: (d.lines || []).filter((row) => row.id !== id) }));
  };

  const fillToMinLines = () => {
    const need = Math.max(0, GROUP_SIGNUP_MIN_LINES - countGroupBillableLines(local));
    if (need <= 0) return;
    const extras = Array.from({ length: need }, () => emptyLandlineLine());
    setLocal((d) => ({ ...d, lines: [...(d.lines || []), ...extras] }));
  };

  const handleSave = () => {
    const next = { ...local, enabled: true };
    const v = validateGroupSignupDraft(next);
    if (!v.ok) {
      setErr(v.message);
      return;
    }
    setErr("");
    onSave?.(next);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-labelledby="group-signup-title"
      >
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="group-signup-title" className="text-[15px] font-black text-slate-900">
                단체 가입 (10회선 이상)
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                처음부터 10회선·B2B 요금으로 가입할 때 설정합니다. 개인 할인으로 먼저 쓰다가 단체 전환하려면 이 버튼 없이
                일반 가입 후 마이페이지에서 등록하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-500"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <p className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-[10px] font-semibold leading-relaxed text-amber-950">
            {GROUP_SIGNUP_AT_REGISTRATION_NOTICE}
          </p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-600">
            {INDIVIDUAL_TO_GROUP_CONVERSION_NOTICE}
          </p>

          <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-3">
            <label className="block text-[10px] font-bold text-slate-600">
              상호(기업명)
              <input
                value={local.companyName}
                onChange={(e) => patch({ companyName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[13px]"
                placeholder="(주)예시테크"
              />
            </label>
            <B2bCompanyContactFields draft={local} onPatch={patch} compact />
          </section>

          <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-black text-emerald-950">
                ③ 직원 회선 ({lineCount}/{GROUP_SIGNUP_MIN_LINES} 이상)
              </p>
              {lineCount < GROUP_SIGNUP_MIN_LINES ? (
                <button
                  type="button"
                  onClick={fillToMinLines}
                  className="shrink-0 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-black text-white"
                >
                  {GROUP_SIGNUP_MIN_LINES}회선 채우기
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-[10px] text-emerald-900/80">
              유선은 <b>지역번호 포함 번호</b>(예: 02-1234-5678)만 등록합니다. 사내 단축 내선(4자리)은 입력하지 않습니다.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addLine("extension")}
                className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[10px] font-black text-emerald-900"
              >
                + 유선
              </button>
              <button
                type="button"
                onClick={() => addLine("mobile")}
                className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[10px] font-black text-emerald-900"
              >
                + 휴대
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {(local.lines || []).length === 0 ? (
                <li className="text-[11px] text-slate-500">추가 회선이 없습니다. 최소 9개 회선을 더 등록하세요.</li>
              ) : null}
              {(local.lines || []).map((row, idx) => (
                <li key={row.id} className="rounded-lg border border-emerald-200/80 bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-emerald-900">
                      {row.kind === "mobile" ? "휴대" : "유선"} · {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(row.id)}
                      className="text-[10px] font-bold text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                  <input
                    value={row.phone}
                    onChange={(e) => updateLine(row.id, "phone", e.target.value)}
                    placeholder={row.kind === "mobile" ? "010-0000-0000" : "02-1234-5678"}
                    className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
                  />
                  <input
                    value={row.assigneeName}
                    onChange={(e) => updateLine(row.id, "assigneeName", e.target.value)}
                    placeholder="담당자명"
                    className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
                  />
                  <input
                    value={row.assigneeTitle}
                    onChange={(e) => updateLine(row.id, "assigneeTitle", e.target.value)}
                    placeholder="직책 (선택)"
                    className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
                  />
                </li>
              ))}
            </ul>
          </section>

          <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2.5">
            <p className="text-[11px] font-black text-blue-950">예상 결제 (단체)</p>
            <p className="mt-1 text-[18px] font-black tabular-nums text-blue-900">{preview.amountLabel}</p>
            <p className="text-[10px] text-blue-800/85">
              {preview.detailLine} · {preview.unitLabel}
            </p>
            {!preview.canCheckout ? (
              <p className="mt-1 text-[10px] font-bold text-amber-800">
                {GROUP_SIGNUP_MIN_LINES}회선 이상이 되어야 결제할 수 있습니다.
              </p>
            ) : null}
          </div>

          {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-800">{err}</p> : null}
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-[13px] font-black text-slate-700"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!preview.canCheckout}
            onClick={handleSave}
            className="flex-[1.4] rounded-xl bg-indigo-600 py-3 text-[13px] font-black text-white disabled:bg-slate-300"
          >
            단체 가입 적용
          </button>
        </div>
      </div>
    </div>
  );
}
