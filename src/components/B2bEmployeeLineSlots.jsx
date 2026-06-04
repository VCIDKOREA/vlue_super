import { useEffect, useMemo } from "react";
import {
  employeeLineSlotCount,
  GROUP_SIGNUP_MIN_LINES,
  resizeEmployeeLines,
  syncDraftToPlannedLineCount
} from "../lib/groupSignupBm.js";
import { ENTERPRISE_LINE_ROLES, pickLineRoleOnChange } from "../lib/enterpriseRoles.js";

/**
 * 접수 회선 수에 맞춰 직원 입력 칸 고정 + 역할(경리·대리인) 지정
 */
export default function B2bEmployeeLineSlots({ draft, onDraftChange }) {
  const planned = Math.max(
    GROUP_SIGNUP_MIN_LINES,
    Math.floor(Number(draft?.plannedLineCount) || GROUP_SIGNUP_MIN_LINES)
  );
  const slotCount = employeeLineSlotCount(planned);

  const lines = useMemo(() => resizeEmployeeLines(draft?.lines, planned), [draft?.lines, planned]);

  useEffect(() => {
    if ((draft?.lines?.length || 0) !== slotCount) {
      onDraftChange?.(syncDraftToPlannedLineCount(draft));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotCount/planned only
  }, [slotCount, planned]);

  const updateLine = (id, field, value) => {
    if (field === "enterpriseRole") {
      onDraftChange?.({
        ...draft,
        lines: pickLineRoleOnChange(lines, id, value)
      });
      return;
    }
    onDraftChange?.({
      ...draft,
      lines: lines.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    });
  };

  const filledCount = lines.filter(
    (row) => String(row.phone || "").replace(/\D/g, "").length >= 9 && String(row.assigneeName || "").trim()
  ).length;

  return (
    <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
      <p className="text-[12px] font-black text-emerald-950">
        ③ 직원 회선 ({filledCount}/{slotCount}) · 총 {planned}회선 (VLUE 인증 1 포함)
      </p>
      <p className="mt-1 text-[10px] text-emerald-900/80">
        접수 회선 수만큼 입력 칸이 <b>{slotCount}개</b> 고정됩니다. <b>경리·대리인</b>은 각 1명만 지정할 수
        있습니다.
      </p>

      <ul className="mt-3 space-y-2">
        {lines.map((row, idx) => (
          <li key={row.id} className="rounded-lg border border-emerald-200/80 bg-white p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-emerald-900">직원 {idx + 1}</span>
              <select
                value={row.kind}
                onChange={(e) => updateLine(row.id, "kind", e.target.value)}
                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold"
              >
                <option value="extension">유선(PC)</option>
                <option value="mobile">휴대(폰+PC)</option>
              </select>
            </div>
            <select
              value={row.enterpriseRole || "STAFF"}
              onChange={(e) => updateLine(row.id, "enterpriseRole", e.target.value)}
              className="mt-2 w-full rounded border border-indigo-200 bg-indigo-50/50 px-2 py-1.5 text-[11px] font-bold text-indigo-950"
            >
              {ENTERPRISE_LINE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </select>
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
              placeholder="부서·직책 (선택)"
              className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
