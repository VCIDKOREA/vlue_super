import { useCallback, useEffect, useState } from "react";
import ModalCloseButton from "../common/ModalCloseButton";
import { requestIamportCertification, consumeIamportCertRedirectResult } from "../../lib/iamportClient.js";
import { getPortoneUserCode } from "../../lib/portoneEnv.js";
import {
  applyManualWithdrawal,
  cancelScheduledWithdrawal,
  fetchWithdrawalStatus,
  sendWithdrawalEmailCode,
  verifyWithdrawalEmail,
  verifyWithdrawalPhone
} from "../../lib/accountWithdrawalApi.js";

const STEPS = {
  intro: "intro",
  phone: "phone",
  email: "email",
  manual: "manual",
  scheduled: "scheduled"
};

function formatDeadline(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

/**
 * 회원 탈퇴 — 휴대폰 PASS → 이메일 → 수동 신청(24h 유예)
 */
export default function AccountWithdrawalFlow({
  open = false,
  isDarkMode = false,
  loginId = "",
  onClose,
  onWithdrawComplete,
  onToast
}) {
  const [step, setStep] = useState(STEPS.intro);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [impUid, setImpUid] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [agreeReverify, setAgreeReverify] = useState(false);
  const [agreeFinal, setAgreeFinal] = useState(false);
  const [agreeFamily, setAgreeFamily] = useState(false);
  const [manual, setManual] = useState({
    loginId: loginId || "",
    password: "",
    phone: "",
    email: "",
    address: ""
  });

  const canProceedAgreements = agreeRefund && agreeReverify && agreeFinal && agreeFamily;

  const resetFlow = useCallback(() => {
    setStep(STEPS.intro);
    setBusy(false);
    setError("");
    setImpUid("");
    setEmailCode("");
    setMaskedEmail("");
    setAgreeRefund(false);
    setAgreeReverify(false);
    setAgreeFinal(false);
    setAgreeFamily(false);
    setManual({
      loginId: loginId || "",
      password: "",
      phone: "",
      email: "",
      address: ""
    });
  }, [loginId]);

  useEffect(() => {
    if (!open) return;
    resetFlow();
    let cancelled = false;
    fetchWithdrawalStatus()
      .then((status) => {
        if (cancelled) return;
        if (status?.pending && status.scheduledAt) {
          setScheduledAt(status.scheduledAt);
          setStep(STEPS.scheduled);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, resetFlow]);

  useEffect(() => {
    if (!open) return;
    const redirect = consumeIamportCertRedirectResult();
    if (redirect?.success && redirect.imp_uid) {
      setImpUid(redirect.imp_uid);
      setStep(STEPS.phone);
    }
  }, [open]);

  const runPass = async () => {
    setBusy(true);
    setError("");
    try {
      const userCode = getPortoneUserCode();
      const cert = await requestIamportCertification(userCode);
      const uid = String(cert?.imp_uid || cert?.impUid || "").trim();
      if (!uid) throw new Error("본인인증 결과를 확인하지 못했습니다.");
      setImpUid(uid);
    } catch (e) {
      setError(e?.message || "본인인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const confirmPhoneWithdraw = async () => {
    if (!impUid) {
      setError("먼저 PASS 본인인증을 완료해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { requirePinForSensitiveAction } = await import("../../lib/appLockBridge.js");
      const auth = await requirePinForSensitiveAction("profile_edit");
      if (!auth.ok) return;
      await verifyWithdrawalPhone(impUid);
      onWithdrawComplete?.();
    } catch (e) {
      setError(e?.message || "탈퇴에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const sendEmail = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await sendWithdrawalEmailCode();
      setMaskedEmail(data.maskedEmail || "");
      onToast?.(`인증번호를 ${data.maskedEmail || "등록 이메일"}로 보냈습니다.`);
    } catch (e) {
      setError(e?.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const confirmEmailWithdraw = async () => {
    if (!emailCode.trim()) {
      setError("인증번호 6자리를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { requirePinForSensitiveAction } = await import("../../lib/appLockBridge.js");
      const auth = await requirePinForSensitiveAction("profile_edit");
      if (!auth.ok) return;
      await verifyWithdrawalEmail(emailCode.trim());
      onWithdrawComplete?.();
    } catch (e) {
      setError(e?.message || "이메일 인증 탈퇴에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const submitManual = async () => {
    if (!canProceedAgreements) {
      setError("탈퇴 안내 항목에 모두 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await applyManualWithdrawal(manual);
      setScheduledAt(data.scheduledAt || "");
      setStep(STEPS.scheduled);
      onToast?.("탈퇴 신청이 접수되었습니다. 24시간 이내 복구할 수 있습니다.");
    } catch (e) {
      setError(e?.message || "탈퇴 신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const recoverAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await cancelScheduledWithdrawal();
      onToast?.("탈퇴 예약이 취소되었습니다.");
      onClose?.();
    } catch (e) {
      setError(e?.message || "복구에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const shell = isDarkMode
    ? "border-white/10 bg-[#111827] text-gray-100"
    : "border-gray-100 bg-white text-gray-900";
  const sub = isDarkMode ? "text-gray-400" : "text-gray-600";
  const inputClass = isDarkMode
    ? "border-white/15 bg-[#1f2937] text-gray-100 placeholder:text-gray-500"
    : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400";
  const ghostBtn = isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-600";

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/45 px-4" onMouseDown={() => onClose?.()}>
      <div
        className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-4 pt-12 shadow-2xl ${shell}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ModalCloseButton variant={isDarkMode ? "subtle" : "default"} onClick={() => onClose?.()} />

        {step === STEPS.intro ? (
          <>
            <p className="text-[15px] font-black text-red-500">회원 탈퇴</p>
            <p className={`mt-2 text-[12px] leading-relaxed ${sub}`}>
              탈퇴는 본인 확인 후 진행됩니다. AI 상담·유선 탈퇴는 제공하지 않습니다.
            </p>
            <ol className={`mt-3 list-decimal space-y-1 pl-4 text-[12px] ${sub}`}>
              <li>가입 시 등록한 휴대폰 PASS 본인인증</li>
              <li>휴대폰 인증이 어려우면 등록 이메일 인증</li>
              <li>둘 다 불가 시 탈퇴 신청(24시간 유예·복구 가능)</li>
            </ol>
            <ul className={`mt-3 space-y-1 text-[12px] ${sub}`}>
              <li>• 가족을 추가한 대표 계정 탈퇴 시 가족 구성원 전원 해산</li>
              <li>• 환불은 결제 정책에 따라 처리됩니다</li>
              <li>• 재가입 시 본인인증·인증명함 절차를 다시 진행합니다</li>
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep(STEPS.phone)}
                className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
              >
                1. 휴대폰 본인인증으로 탈퇴
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep(STEPS.email);
                  sendEmail();
                }}
                className={`w-full rounded-xl border py-3 text-[13px] font-bold disabled:opacity-50 ${
                  isDarkMode ? "border-white/15" : "border-gray-200"
                }`}
              >
                2. 등록 이메일로 인증
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep(STEPS.manual)}
                className={`w-full rounded-xl border py-3 text-[13px] font-bold disabled:opacity-50 ${
                  isDarkMode ? "border-white/15 text-rose-300" : "border-rose-200 text-rose-600"
                }`}
              >
                3. 탈퇴 신청하기
              </button>
            </div>
          </>
        ) : null}

        {step === STEPS.phone ? (
          <>
            <p className="text-[15px] font-black">휴대폰 본인인증</p>
            <p className={`mt-1 text-[12px] leading-relaxed ${sub}`}>
              가입 시 등록한 휴대폰으로 PASS 본인인증을 완료하면 즉시 탈퇴됩니다.
            </p>
            {error ? <p className="mt-2 text-[12px] font-bold text-rose-500">{error}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={runPass}
                className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
              >
                {busy ? "인증 중…" : impUid ? "본인인증 다시 하기" : "PASS 본인인증"}
              </button>
              {impUid ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmPhoneWithdraw}
                  className="w-full rounded-xl bg-rose-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
                >
                  {busy ? "처리 중…" : "인증 완료 · 탈퇴 진행"}
                </button>
              ) : null}
              <button type="button" onClick={() => setStep(STEPS.intro)} className={`w-full rounded-xl py-2.5 text-[12px] font-bold ${ghostBtn}`}>
                이전
              </button>
            </div>
          </>
        ) : null}

        {step === STEPS.email ? (
          <>
            <p className="text-[15px] font-black">등록 이메일 인증</p>
            <p className={`mt-1 text-[12px] leading-relaxed ${sub}`}>
              {maskedEmail ? `${maskedEmail}로 발송된` : "등록 이메일로 발송된"} 6자리 인증번호를 입력해 주세요.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className={`mt-3 w-full rounded-xl border px-3 py-3 text-center text-[18px] font-black tracking-[0.35em] outline-none ${inputClass}`}
            />
            {error ? <p className="mt-2 text-[12px] font-bold text-rose-500">{error}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={confirmEmailWithdraw}
                className="w-full rounded-xl bg-rose-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
              >
                {busy ? "처리 중…" : "인증 완료 · 탈퇴 진행"}
              </button>
              <button type="button" disabled={busy} onClick={sendEmail} className={`w-full rounded-xl py-2.5 text-[12px] font-bold ${ghostBtn}`}>
                인증번호 다시 받기
              </button>
              <button type="button" onClick={() => setStep(STEPS.intro)} className={`w-full rounded-xl py-2.5 text-[12px] font-bold ${ghostBtn}`}>
                이전
              </button>
            </div>
          </>
        ) : null}

        {step === STEPS.manual ? (
          <>
            <p className="text-[15px] font-black text-red-500">탈퇴 신청</p>
            <p className={`mt-1 text-[12px] leading-relaxed ${sub}`}>
              아래 정보가 모두 일치하면 24시간 후 탈퇴가 완료됩니다. 그 전까지 복구할 수 있습니다.
            </p>
            <div className="mt-3 space-y-2">
              {[
                ["loginId", "아이디"],
                ["password", "비밀번호", "password"],
                ["phone", "기존 휴대폰 번호", "tel"],
                ["email", "등록 이메일", "email"],
                ["address", "등록 시 입력 주소"]
              ].map(([key, label, type = "text"]) => (
                <label key={key} className={`block text-[11px] font-bold ${sub}`}>
                  {label}
                  <input
                    type={type}
                    value={manual[key]}
                    onChange={(e) => setManual((prev) => ({ ...prev, [key]: e.target.value }))}
                    className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-[12px] outline-none ${inputClass}`}
                  />
                </label>
              ))}
            </div>
            <div className={`mt-3 space-y-2 text-[12px] ${sub}`}>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={agreeRefund} onChange={(e) => setAgreeRefund(e.target.checked)} className="mt-0.5" />
                <span>환불은 결제 정책 및 사용 이력 검토 후 처리되는 것에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={agreeReverify} onChange={(e) => setAgreeReverify(e.target.checked)} className="mt-0.5" />
                <span>재가입 시 본인인증·인증명함 절차를 처음부터 다시 진행함에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={agreeFamily} onChange={(e) => setAgreeFamily(e.target.checked)} className="mt-0.5" />
                <span>가족 대표 계정 탈퇴 시 가족 구성원 전원 해산에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={agreeFinal} onChange={(e) => setAgreeFinal(e.target.checked)} className="mt-0.5" />
                <span>24시간 유예 후 탈퇴 완료·데이터 복구 제한을 확인했습니다.</span>
              </label>
            </div>
            {error ? <p className="mt-2 text-[12px] font-bold text-rose-500">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setStep(STEPS.intro)} className={`flex-1 rounded-xl py-2.5 text-[12px] font-bold ${ghostBtn}`}>
                이전
              </button>
              <button
                type="button"
                disabled={busy || !canProceedAgreements}
                onClick={submitManual}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
              >
                {busy ? "신청 중…" : "탈퇴 신청"}
              </button>
            </div>
          </>
        ) : null}

        {step === STEPS.scheduled ? (
          <>
            <p className="text-[15px] font-black text-amber-500">탈퇴 예약됨</p>
            <p className={`mt-2 text-[12px] leading-relaxed ${sub}`}>
              {formatDeadline(scheduledAt)}까지 탈퇴가 보류됩니다. 그 전까지 아래 버튼으로 복구할 수 있습니다.
            </p>
            {error ? <p className="mt-2 text-[12px] font-bold text-rose-500">{error}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={recoverAccount}
                className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
              >
                {busy ? "처리 중…" : "탈퇴 취소 · 계정 복구"}
              </button>
              <button type="button" onClick={() => onClose?.()} className={`w-full rounded-xl py-2.5 text-[12px] font-bold ${ghostBtn}`}>
                닫기
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
