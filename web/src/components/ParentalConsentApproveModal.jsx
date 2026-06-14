import { useState } from "react";
import { approveParentalConsentAsGuardian } from "../lib/parentalConsentApi.js";

/** 보호자 앱 — 자녀 가입 승인 (PASS) */
export default function ParentalConsentApproveModal({
  open,
  request,
  isDarkMode = false,
  onClose,
  onApproved,
  onToast
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!open || !request) return null;

  const panel = isDarkMode ? "border-white/10 bg-[#151821] text-gray-100" : "border-indigo-100 bg-white text-gray-900";
  const sub = isDarkMode ? "text-gray-400" : "text-gray-600";

  const runApprove = async ({ devBypass = false } = {}) => {
    setBusy(true);
    setMsg("");
    try {
      await approveParentalConsentAsGuardian(request.wardUserId, { devBypass });
      onToast?.("자녀 가입 승인이 완료되었습니다. 가족보호가 시작됩니다.");
      onApproved?.(request);
      onClose?.();
    } catch (e) {
      setMsg(e?.message || "승인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div className={`w-full max-w-md rounded-2xl border p-5 shadow-xl ${panel}`}>
        <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500">Family Protection</p>
        <h2 className="mt-1 text-[17px] font-black">자녀 가입 승인</h2>
        <p className={`mt-2 text-[12px] leading-relaxed ${sub}`}>
          <strong>{request.wardLabel || "자녀"}</strong> 님의 VLUE 가입에 법정대리인 동의가 필요합니다.
          보이스피싱·가족보호 정책에 따라 <strong>보호자 본인 PASS 인증</strong> 후 승인해 주세요.
        </p>
        {msg ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-950">{msg}</p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => runApprove({ devBypass: false })}
          className="mt-4 w-full rounded-xl bg-indigo-600 py-3.5 text-[14px] font-black text-white disabled:opacity-50"
        >
          PASS 본인인증으로 승인
        </button>
        {import.meta.env.DEV ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => runApprove({ devBypass: true })}
            className="mt-2 w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-[11px] font-bold text-gray-500"
          >
            [DEV] 승인 우회
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className={`mt-3 w-full rounded-xl py-2.5 text-[12px] font-bold ${sub}`}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
