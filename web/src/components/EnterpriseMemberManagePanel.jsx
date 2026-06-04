import { useCallback, useEffect, useState } from "react";
import {
  fetchEnterpriseMembers,
  patchEnterpriseCartLine,
  patchEnterpriseMember
} from "../lib/b2bEnterpriseApi.js";
import {
  ENTERPRISE_LINE_ROLES,
  ENTERPRISE_ROLE_LABELS,
  normalizeEnterpriseRole
} from "../lib/enterpriseRoles.js";

const EMPTY_FORM = {
  assigneeName: "",
  assigneeTitle: "",
  phone: "",
  enterpriseRole: "STAFF",
  lineKind: "mobile",
  resetPassword: false
};

export default function EnterpriseMemberManagePanel({ onToast }) {
  const [data, setData] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchEnterpriseMembers();
      setData(res);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data?.members?.length) return null;

  const editing = data.members.find((m) => m.lineId === editId);

  const openEdit = (member) => {
    setEditId(member.lineId);
    setForm({
      assigneeName: member.assigneeName || "",
      assigneeTitle: member.assigneeTitle || member.user?.enterpriseDept || "",
      phone: member.phoneE164 || "",
      enterpriseRole: normalizeEnterpriseRole(member.enterpriseRole),
      lineKind: member.lineKind === "extension" ? "extension" : "mobile",
      resetPassword: false
    });
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      if (editing.linkedUserId) {
        const res = await patchEnterpriseMember(editing.linkedUserId, {
          assigneeName: form.assigneeName.trim(),
          enterpriseDept: form.assigneeTitle.trim(),
          enterpriseRole: form.enterpriseRole,
          phone: form.phone.trim(),
          resetPassword: form.resetPassword
        });
        if (res.newPassword) {
          onToast?.(`비밀번호가 재설정되었습니다: ${res.newPassword}`);
        } else {
          onToast?.("계정 정보가 저장되었습니다.");
        }
      } else {
        await patchEnterpriseCartLine(editing.lineId, {
          assigneeName: form.assigneeName.trim(),
          assigneeTitle: form.assigneeTitle.trim(),
          realCliPhone: form.phone.trim(),
          enterpriseRole: form.enterpriseRole,
          lineKind: form.lineKind
        });
        onToast?.("회선 정보가 저장되었습니다.");
      }
      setEditId(null);
      await load();
    } catch (e) {
      onToast?.(e?.message || "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const chatHint = data.groupChat?.ready
    ? "그룹 채팅 개설됨"
    : `그룹 채팅 대기 (${data.lineCount}/${data.plannedLineCount}명)`;

  return (
    <section className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-black text-slate-900">직원 계정 관리</p>
          <p className="text-[10px] text-slate-600">
            {data.companyName} · {chatHint}
          </p>
        </div>
        {editId && (
          <button
            type="button"
            onClick={() => setEditId(null)}
            className="text-[10px] font-bold text-slate-500"
          >
            편집 취소
          </button>
        )}
      </div>

      <div className="mt-2 space-y-1.5">
        {data.members.map((m) => (
          <div
            key={m.lineId}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-[11px] ${
              editId === m.lineId ? "border-amber-300 bg-white" : "border-slate-200 bg-white/80"
            }`}
          >
            <div className="min-w-0">
              <p className="font-black text-slate-900">
                {m.assigneeName || "미입력"}
                <span className="ml-1 font-semibold text-slate-500">
                  · {ENTERPRISE_ROLE_LABELS[m.enterpriseRole] || m.enterpriseRole}
                </span>
              </p>
              <p className="text-[10px] text-slate-500">
                {m.phoneE164}
                {m.assigneeTitle ? ` · ${m.assigneeTitle}` : ""}
                {m.linkedUserId ? " · 계정 연결됨" : " · 등록 전"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openEdit(m)}
              className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700"
            >
              수정
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-black text-slate-800">
            {editing.assigneeName || "회선"} 수정
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[10px] font-bold text-slate-600">
              이름
              <input
                value={form.assigneeName}
                onChange={(e) => setForm((f) => ({ ...f, assigneeName: e.target.value }))}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-600">
              직함/부서
              <input
                value={form.assigneeTitle}
                onChange={(e) => setForm((f) => ({ ...f, assigneeTitle: e.target.value }))}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-600">
              휴대폰/회선번호
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-600">
              역할
              <select
                value={form.enterpriseRole}
                onChange={(e) => setForm((f) => ({ ...f, enterpriseRole: e.target.value }))}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
              >
                {ENTERPRISE_LINE_ROLES.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {!editing.linkedUserId && (
              <label className="block text-[10px] font-bold text-slate-600">
                회선 유형
                <select
                  value={form.lineKind}
                  onChange={(e) => setForm((f) => ({ ...f, lineKind: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
                >
                  <option value="mobile">모바일</option>
                  <option value="extension">유선(내선)</option>
                </select>
              </label>
            )}
          </div>
          {editing.linkedUserId && (
            <label className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <input
                type="checkbox"
                checked={form.resetPassword}
                onChange={(e) => setForm((f) => ({ ...f, resetPassword: e.target.checked }))}
              />
              초기 비밀번호 재발급
            </label>
          )}
          <button
            type="button"
            disabled={busy || !form.assigneeName.trim() || !form.phone.trim()}
            onClick={save}
            className="mt-3 w-full rounded-lg bg-slate-900 py-2 text-[11px] font-black text-white disabled:opacity-50"
          >
            저장
          </button>
        </div>
      )}
    </section>
  );
}
