import { useCallback, useEffect, useState } from "react";
import AgencyDcpMiniPopup from "./agency/AgencyDcpMiniPopup.jsx";
import {
  createAdminAgency,
  createAdminAgencyLogoUploadUrl,
  fetchAdminAgencies,
  patchAdminAgency
} from "../../lib/adminConsoleApi.js";
import "../../styles/showcase-call-glass.css";

const ABNORMAL =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

function toCard(agency) {
  return {
    profileKind: "dcp",
    name: agency.agencyName,
    organization: agency.agencyName,
    phone: agency.shortNumber,
    website: agency.officialWebsite,
    logoUrl: agency.logoUrl,
    dcp: agency
  };
}

export default function AdminAgencyDcpPanel({ onToast }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ agencyName: "", shortNumber: "", officialWebsite: "" });

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminAgencies();
      setItems(data.items || []);
    } catch (e) {
      onToast?.(e?.message || "기관 목록을 불러오지 못했습니다.");
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (id, patch) => {
    setBusy(true);
    try {
      const data = await patchAdminAgency(id, patch);
      setItems((prev) => prev.map((row) => (row.id === id ? data.agency : row)));
      setEditing((cur) => (cur?.id === id ? data.agency : cur));
      onToast?.("저장되었습니다. 통화 조회에 바로 반영됩니다.");
    } catch (e) {
      onToast?.(e?.message || "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const onUploadLogo = async (agency, file) => {
    if (!file) return;
    setBusy(true);
    try {
      const signed = await createAdminAgencyLogoUploadUrl(agency.id, {
        fileName: file.name,
        contentType: file.type || "image/png",
        fileSize: file.size
      });
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": signed.contentType || file.type || "image/png" },
        body: file
      });
      if (!put.ok) throw new Error("로고 업로드 실패");
      await save(agency.id, { logoUrl: signed.publicUrl });
    } catch (e) {
      onToast?.(e?.message || "로고 업로드 실패");
      setBusy(false);
    }
  };

  const onCreate = async () => {
    setBusy(true);
    try {
      const data = await createAdminAgency(draft);
      setItems((prev) => [...prev, data.agency].sort((a, b) => a.sortOrder - b.sortOrder));
      setDraft({ agencyName: "", shortNumber: "", officialWebsite: "" });
      setCreating(false);
      setEditing(data.agency);
      onToast?.("기관이 추가되었습니다.");
    } catch (e) {
      onToast?.(e?.message || "추가 실패");
    } finally {
      setBusy(false);
    }
  };

  const triggerTest = (agency, route) => {
    const payload = { route, number: agency.shortNumber, agency };
    try {
      sessionStorage.setItem("vlue_dcp_test_route", route);
      sessionStorage.setItem("vlue_dcp_test_number", agency.shortNumber);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("vlue-dcp-test", { detail: payload }));
    setPreview({ agency, route });
    onToast?.(route === "abnormal" ? "비정상 경로 시뮬레이터" : "정상 DCP 시뮬레이터");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-black text-slate-900">국가기관 DCP 화이트리스트</h2>
          <p className="mt-1 text-[12px] text-slate-500">
            수·발신 시 DCC 대신 디지털인증프로필(로고·공식번호·웹사이트)이 송출됩니다. 로고는 직접 업로드하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-bold text-white"
        >
          기관 추가
        </button>
      </div>

      {creating ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[13px] font-black text-slate-800">새 기관</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
              placeholder="기관명"
              value={draft.agencyName}
              onChange={(e) => setDraft((d) => ({ ...d, agencyName: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
              placeholder="공식 번호 (112)"
              value={draft.shortNumber}
              onChange={(e) => setDraft((d) => ({ ...d, shortNumber: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
              placeholder="공식 웹사이트"
              value={draft.officialWebsite}
              onChange={(e) => setDraft((d) => ({ ...d, officialWebsite: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={onCreate} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white">
              저장
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-600">
              취소
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-[12px]">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">번호</th>
              <th className="px-3 py-2.5">기관</th>
              <th className="px-3 py-2.5">웹사이트</th>
              <th className="px-3 py-2.5">로고</th>
              <th className="px-3 py-2.5">경로</th>
              <th className="px-3 py-2.5">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className="px-3 py-2.5 font-black text-slate-900">{row.shortNumber}</td>
                <td className="px-3 py-2.5 text-slate-800">{row.agencyName}</td>
                <td className="px-3 py-2.5 text-slate-600">{row.officialWebsite.replace(/^https?:\/\//, "")}</td>
                <td className="px-3 py-2.5">
                  {row.logoUrl ? (
                    <img src={row.logoUrl} alt="" className="h-8 w-8 rounded object-contain bg-slate-50" />
                  ) : (
                    <span className="text-amber-700">미등록</span>
                  )}
                </td>
                <td className="px-3 py-2.5">{row.routeStatus === "abnormal" ? "비정상" : "정상"}</td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white"
                  >
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-black text-slate-900">{editing.agencyName} 수정</p>
            <button type="button" onClick={() => setEditing(null)} className="text-[12px] font-bold text-slate-500">
              닫기
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-bold text-slate-500">
              기관명
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900"
                value={editing.agencyName}
                onChange={(e) => setEditing((a) => ({ ...a, agencyName: e.target.value }))}
              />
            </label>
            <label className="text-[11px] font-bold text-slate-500">
              공식 번호
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900"
                value={editing.shortNumber}
                onChange={(e) => setEditing((a) => ({ ...a, shortNumber: e.target.value }))}
              />
            </label>
            <label className="text-[11px] font-bold text-slate-500 sm:col-span-2">
              공식 웹사이트
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900"
                value={editing.officialWebsite}
                onChange={(e) => setEditing((a) => ({ ...a, officialWebsite: e.target.value }))}
              />
            </label>
            <label className="text-[11px] font-bold text-slate-500 sm:col-span-2">
              로고 URL (직접 입력도 가능)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900"
                value={editing.logoUrl}
                onChange={(e) => setEditing((a) => ({ ...a, logoUrl: e.target.value }))}
                placeholder="업로드하거나 공식 로고 URL"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-bold text-slate-700">
              공식 로고 업로드
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void onUploadLogo(editing, file);
                }}
              />
            </label>
            <select
              className="rounded-lg border border-slate-200 px-2 py-2 text-[12px]"
              value={editing.routeStatus}
              onChange={(e) => setEditing((a) => ({ ...a, routeStatus: e.target.value }))}
            >
              <option value="normal">정상 경로</option>
              <option value="abnormal">비정상 경로</option>
            </select>
            <label className="flex items-center gap-1 text-[12px] font-bold text-slate-600">
              <input
                type="checkbox"
                checked={editing.enabled !== false}
                onChange={(e) => setEditing((a) => ({ ...a, enabled: e.target.checked }))}
              />
              활성
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                save(editing.id, {
                  agencyName: editing.agencyName,
                  shortNumber: editing.shortNumber,
                  officialWebsite: editing.officialWebsite,
                  logoUrl: editing.logoUrl,
                  routeStatus: editing.routeStatus,
                  enabled: editing.enabled
                })
              }
              className="rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-bold text-white"
            >
              저장 · 즉시 반영
            </button>
            <button
              type="button"
              onClick={() => triggerTest(editing, "normal")}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-800"
            >
              정상 경로 테스트
            </button>
            <button
              type="button"
              onClick={() => triggerTest(editing, "abnormal")}
              className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-800"
            >
              비정상 경로 테스트
            </button>
          </div>
        </div>
      ) : null}

      {preview ? (
        <AgencyDcpMiniPopup
          open
          card={toCard(preview.agency)}
          incomingNumber={preview.agency.shortNumber}
          abnormal={preview.route === "abnormal"}
          warning={ABNORMAL}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
