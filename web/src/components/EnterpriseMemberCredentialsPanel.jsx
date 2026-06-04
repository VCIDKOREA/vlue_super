import { useCallback, useEffect, useState } from "react";
import { fetchMemberCredentials } from "../lib/b2bEnterpriseApi.js";
import { ENTERPRISE_ROLE_LABELS } from "../lib/enterpriseRoles.js";

export default function EnterpriseMemberCredentialsPanel({ onToast }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMemberCredentials();
      setRows(data.credentials || []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (rows.length === 0) return null;

  const copyAll = async () => {
    const text = rows
      .map(
        (r) =>
          `[${r.roleLabel || ENTERPRISE_ROLE_LABELS[r.enterpriseRole] || r.enterpriseRole}] ${r.assigneeName}\n아이디: ${r.publicHandle}\n비밀번호: ${r.initialPassword}\n회선: ${r.phoneE164}`
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      onToast?.("직원 로그인 정보를 클립보드에 복사했습니다.");
    } catch {
      onToast?.("복사에 실패했습니다.");
    }
  };

  return (
    <section className="mt-3 rounded-xl border border-violet-200 bg-violet-50/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-black text-violet-950">직원 로그인 안내 ({rows.length}명)</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg bg-violet-700 px-2.5 py-1.5 text-[10px] font-black text-white"
        >
          {open ? "접기" : "보기"}
        </button>
      </div>
      <p className="mt-1 text-[10px] text-violet-900/85">
        회선 개통 후 ID/PW를 직원에게 전달하세요. PC 최초 로그인은 대표·대리인 기기 승인이 필요합니다.
      </p>
      {open ? (
        <div>
          <button
            type="button"
            onClick={copyAll}
            className="mb-2 mt-2 w-full rounded-lg border border-violet-300 bg-white py-2 text-[11px] font-black text-violet-800"
          >
            전체 복사
          </button>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id || r.userId} className="rounded-lg border border-violet-100 bg-white p-2.5 text-[11px]">
                <p className="font-black text-slate-900">
                  {r.assigneeName}{" "}
                  <span className="font-bold text-violet-700">
                    ({r.roleLabel || ENTERPRISE_ROLE_LABELS[r.enterpriseRole]})
                  </span>
                </p>
                <p className="mt-1 font-mono text-[10px] text-slate-700">아이디: {r.publicHandle}</p>
                <p className="font-mono text-[10px] text-slate-700">비밀번호: {r.initialPassword}</p>
                <p className="text-[9px] text-slate-500">{r.phoneE164}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
