import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addB2bCartLine,
  fetchB2bEnterpriseMe,
  fetchEnterpriseMembers,
  patchEnterpriseCartLine,
  patchEnterpriseMember,
  removeB2bCartLine,
  saveB2bEnterpriseSetup
} from "../lib/b2bEnterpriseApi.js";
import {
  ENTERPRISE_LINE_ROLES,
  ENTERPRISE_ROLE_LABELS,
  normalizeEnterpriseRole
} from "../lib/enterpriseRoles.js";
import BackButton from "./common/BackButton";

const EMPTY_FORM = {
  assigneeName: "",
  assigneeTitle: "",
  phone: "",
  enterpriseRole: "STAFF",
  lineKind: "mobile",
  resetPassword: false
};

const EMPTY_ADD = {
  lineKind: "mobile",
  realCliPhone: "",
  assigneeName: "",
  assigneeTitle: "",
  enterpriseRole: "STAFF"
};

/**
 * 기업 대표·대리인 — 회선·직원 목록 등록·수정·추가 (마이페이지 사이드바)
 */
export default function EnterpriseLineManagePanel({ onToast, onBack, isDarkMode = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-400" : "text-gray-500";
  const panel = isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white";
  const inputCls = isDarkMode
    ? "mt-0.5 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[12px] text-gray-100"
    : "mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const members = await fetchEnterpriseMembers();
      setData(members);
    } catch (e) {
      setData(null);
      onToast?.(e?.message || "회선 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = data?.members || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => {
      const blob = [m.assigneeName, m.assigneeTitle, m.phoneE164, m.enterpriseRole, m.user?.publicHandle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [data, search]);

  const editing = data?.members?.find((m) => m.lineId === editId);

  const openEdit = (member) => {
    setEditId(member.lineId);
    setAddOpen(false);
    setForm({
      assigneeName: member.assigneeName || "",
      assigneeTitle: member.assigneeTitle || member.user?.enterpriseDept || "",
      phone: member.phoneE164 || "",
      enterpriseRole: normalizeEnterpriseRole(member.enterpriseRole),
      lineKind: member.lineKind === "extension" ? "extension" : "mobile",
      resetPassword: false
    });
  };

  const addLine = async () => {
    if (!addForm.assigneeName.trim() || !addForm.realCliPhone.trim()) {
      onToast?.("성명과 회선 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const me = await fetchB2bEnterpriseMe();
      const ent = me?.enterprise;
      if (ent) {
        await saveB2bEnterpriseSetup({
          companyName: ent.companyName,
          masterDisplayNumber: ent.masterDisplayNumber,
          carrier: ent.carrier,
          billingCycle: ent.billingCycle
        });
      }
      await addB2bCartLine({
        lineKind: addForm.lineKind,
        realCliPhone: addForm.realCliPhone.trim(),
        assigneeName: addForm.assigneeName.trim(),
        assigneeTitle: addForm.assigneeTitle.trim(),
        enterpriseRole: addForm.enterpriseRole,
        memberPhone: addForm.lineKind === "mobile" ? addForm.realCliPhone.trim() : undefined
      });
      setAddForm(EMPTY_ADD);
      setAddOpen(false);
      onToast?.("회선이 추가되었습니다.");
      await load();
    } catch (e) {
      onToast?.(e?.message || "회선 추가 실패");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
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
          onToast?.(`비밀번호 재설정: ${res.newPassword}`);
        } else {
          onToast?.("저장되었습니다.");
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

  const removeLine = async (lineId) => {
    if (!window.confirm("이 회선을 목록에서 삭제할까요?")) return;
    setBusy(true);
    try {
      await removeB2bCartLine(lineId);
      if (editId === lineId) setEditId(null);
      onToast?.("삭제되었습니다.");
      await load();
    } catch (e) {
      onToast?.(e?.message || "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${isDarkMode ? "text-gray-100" : ""}`}>
      <div className={`flex shrink-0 items-center gap-1 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
        <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
        <div className="min-w-0 flex-1">
          <p className={`text-[17px] font-black ${headText}`}>기업 회선·직원 목록</p>
          <p className={`text-[11px] ${subText}`}>
            {data?.companyName || "기업"} · 등록 {data?.lineCount ?? 0}명
            {data?.groupChat?.ready ? " · 그룹채팅 개설됨" : ""}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름·번호·역할 검색"
          className={`mb-3 w-full rounded-xl border px-3 py-2.5 text-[13px] ${
            isDarkMode ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50"
          }`}
        />

        <button
          type="button"
          onClick={() => {
            setAddOpen((v) => !v);
            setEditId(null);
          }}
          className="mb-3 w-full rounded-xl bg-indigo-600 py-2.5 text-[13px] font-black text-white shadow-sm active:scale-[0.99]"
        >
          {addOpen ? "추가 폼 닫기" : "+ 회선·직원 추가"}
        </button>

        {addOpen ? (
          <div className={`mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 ${isDarkMode ? "border-indigo-500/30 bg-indigo-500/10" : ""}`}>
            <p className="text-[12px] font-black text-indigo-950">새 회선 등록</p>
            <p className="mt-0.5 text-[10px] text-indigo-900/80">경리·대리인은 각 1명만 지정할 수 있습니다.</p>
            <select
              value={addForm.enterpriseRole}
              onChange={(e) => setAddForm((f) => ({ ...f, enterpriseRole: e.target.value }))}
              className={`${inputCls} mt-2 font-bold`}
            >
              {ENTERPRISE_LINE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </select>
            <select
              value={addForm.lineKind}
              onChange={(e) => setAddForm((f) => ({ ...f, lineKind: e.target.value }))}
              className={`${inputCls} mt-2 font-bold`}
            >
              <option value="mobile">업무용 휴대 (010)</option>
              <option value="extension">유선 (지역번호)</option>
            </select>
            <input
              value={addForm.realCliPhone}
              onChange={(e) => setAddForm((f) => ({ ...f, realCliPhone: e.target.value }))}
              placeholder={addForm.lineKind === "mobile" ? "010-0000-0000" : "02-1234-5678"}
              className={inputCls}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={addForm.assigneeName}
                onChange={(e) => setAddForm((f) => ({ ...f, assigneeName: e.target.value }))}
                placeholder="성명"
                className={inputCls}
              />
              <input
                value={addForm.assigneeTitle}
                onChange={(e) => setAddForm((f) => ({ ...f, assigneeTitle: e.target.value }))}
                placeholder="직함/부서"
                className={inputCls}
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={addLine}
              className="mt-3 w-full rounded-lg bg-emerald-700 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
            >
              목록에 추가
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className={`py-8 text-center text-[12px] ${subText}`}>목록 불러오는 중…</p>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <p className={`rounded-xl border border-dashed px-3 py-8 text-center text-[12px] ${subText}`}>
            {search ? "검색 결과가 없습니다." : "등록된 회선이 없습니다. 위에서 추가해 주세요."}
          </p>
        ) : null}

        <div className="space-y-2">
          {filtered.map((m) => (
            <div
              key={m.lineId}
              className={`rounded-xl border px-3 py-2.5 ${
                editId === m.lineId
                  ? "border-amber-300 bg-amber-50/80"
                  : isDarkMode
                    ? "border-white/10 bg-white/5"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-black ${headText}`}>
                    {m.assigneeName || "미입력"}
                    <span className="ml-1 text-[11px] font-semibold text-indigo-600">
                      · {ENTERPRISE_ROLE_LABELS[m.enterpriseRole] || m.enterpriseRole}
                    </span>
                  </p>
                  <p className={`text-[11px] ${subText}`}>
                    {m.lineKind === "mobile" ? "휴대" : "유선"} · {m.phoneE164}
                    {m.assigneeTitle ? ` · ${m.assigneeTitle}` : ""}
                  </p>
                  <p className={`text-[10px] ${subText}`}>
                    {m.linkedUserId ? "계정 연결됨" : "개통 전 · 수정 가능"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeLine(m.lineId)}
                    className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editing ? (
          <div className={`mt-4 rounded-2xl border border-amber-200 p-3 ${panel}`}>
            <p className={`mb-2 text-[12px] font-black ${headText}`}>
              「{editing.assigneeName || "회선"}」 수정
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={`block text-[10px] font-bold ${subText}`}>
                이름
                <input
                  value={form.assigneeName}
                  onChange={(e) => setForm((f) => ({ ...f, assigneeName: e.target.value }))}
                  className={inputCls}
                />
              </label>
              <label className={`block text-[10px] font-bold ${subText}`}>
                직함/부서
                <input
                  value={form.assigneeTitle}
                  onChange={(e) => setForm((f) => ({ ...f, assigneeTitle: e.target.value }))}
                  className={inputCls}
                />
              </label>
              <label className={`block text-[10px] font-bold ${subText}`}>
                휴대폰/회선번호
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputCls}
                />
              </label>
              <label className={`block text-[10px] font-bold ${subText}`}>
                역할
                <select
                  value={form.enterpriseRole}
                  onChange={(e) => setForm((f) => ({ ...f, enterpriseRole: e.target.value }))}
                  className={inputCls}
                >
                  {ENTERPRISE_LINE_ROLES.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              {!editing.linkedUserId ? (
                <label className={`block text-[10px] font-bold ${subText}`}>
                  회선 유형
                  <select
                    value={form.lineKind}
                    onChange={(e) => setForm((f) => ({ ...f, lineKind: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="mobile">모바일</option>
                    <option value="extension">유선</option>
                  </select>
                </label>
              ) : null}
            </div>
            {editing.linkedUserId ? (
              <label className={`mt-2 flex items-center gap-2 text-[10px] font-bold ${subText}`}>
                <input
                  type="checkbox"
                  checked={form.resetPassword}
                  onChange={(e) => setForm((f) => ({ ...f, resetPassword: e.target.checked }))}
                />
                초기 비밀번호 재발급
              </label>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={saveEdit}
                className="flex-1 rounded-lg bg-slate-900 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-[12px] font-bold text-slate-600"
              >
                취소
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
