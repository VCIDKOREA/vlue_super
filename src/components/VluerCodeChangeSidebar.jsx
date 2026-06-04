import { useCallback, useEffect, useState } from "react";
import { fetchVluerDashboard, requestVluerCodeChange } from "../lib/vluerDashboardApi.js";

function formatKrw(n) {
  return `${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR")}원`;
}

function ModalShell({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
        <h3 className="text-center text-[15px] font-bold text-slate-900">{title}</h3>
        <div className="mt-3">{children}</div>
        {footer ? <div className="mt-4 flex gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

/** 마이페이지 사이드바 — 가입코드 변경 신청 */
export default function VluerCodeChangeSidebar({ isDarkMode = false }) {
  const [policy, setPolicy] = useState({ lockMonths: 3, penaltyMonths: 6, penaltyKrw: 28300 });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState("");

  const loadPolicy = useCallback(async () => {
    try {
      const d = await fetchVluerDashboard();
      setPolicy({
        lockMonths: d?.fear?.lockMonths ?? 3,
        penaltyMonths: d?.fear?.penaltyMonths ?? 6,
        penaltyKrw: d?.fear?.penaltyFullPriceKrw ?? 28300
      });
    } catch {
      /* 기본값 유지 */
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const submit = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await requestVluerCodeChange(input);
      setOpen(false);
      setInput("");
      setToast(res?.message || "신청이 접수되었습니다.");
      setTimeout(() => setToast(""), 2800);
      loadPolicy();
    } catch (e) {
      setMsg(e?.message || "신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const btnCls = isDarkMode
    ? "border-white/15 bg-white/5 text-gray-100 hover:bg-white/10"
    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";

  return (
    <>
      <div className="mt-4 px-1">
        <button
          type="button"
          onClick={() => {
            setMsg("");
            setOpen(true);
          }}
          className={`flex w-full items-center justify-center rounded-[20px] border py-2.5 text-center text-[12px] font-black shadow-sm active:scale-[0.98] ${btnCls}`}
        >
          가입코드 변경 신청
        </button>
      </div>

      {toast ? (
        <p className="mt-2 px-1 text-center text-[11px] font-semibold text-emerald-600">{toast}</p>
      ) : null}

      <ModalShell
        open={open}
        title="가입코드 변경 신청"
        onClose={() => !busy && setOpen(false)}
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy || !input.trim()}
              onClick={submit}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {busy ? "처리 중…" : "신청 확인"}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-[12px] leading-relaxed text-slate-700">
          <ul className="list-disc space-y-1.5 pl-4 text-[11px]">
            <li>가입 이후 {policy.lockMonths}개월간 코드 변경이 제한됩니다.</li>
            <li>
              변경 승인 시 <strong>{policy.penaltyMonths}개월</strong> 동안 월{" "}
              <strong>{formatKrw(policy.penaltyKrw)}</strong> 정가가 적용됩니다.
            </li>
            <li>
              해당 기간({policy.penaltyMonths}개월)은 추천인 레퍼럴 수익 또는 리워드포인트가 지급되지 않습니다.
            </li>
          </ul>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="변경할 추천 코드"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-bold uppercase"
            autoComplete="off"
          />
          {msg ? <p className="text-[11px] font-semibold text-red-600">{msg}</p> : null}
          <p className="text-[10px] text-slate-500">위 내용을 확인했으며, 신청에 동의합니다.</p>
        </div>
      </ModalShell>
    </>
  );
}
