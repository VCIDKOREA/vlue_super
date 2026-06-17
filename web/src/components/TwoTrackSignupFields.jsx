import { useCallback, useState } from "react";
import { apiUrl } from "../lib/apiBase.js";
import { isValidMemberHandleSlug, normalizeMemberHandleSlug } from "../lib/memberHandleRules.js";

function isValidEmailShape(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

/**
 * 투트랙 가입 — 경로 A(비즈니스 메일) / 경로 B(VLUE ID만)
 */
export default function TwoTrackSignupFields({
  signupTrack,
  onSignupTrackChange,
  businessEmail,
  onBusinessEmailChange,
  emailOtp,
  onEmailOtpChange,
  emailVerify,
  onEmailVerifyChange,
  desiredMemberId,
  onDesiredMemberIdChange,
  idCheck,
  onRunCheckLoginId,
  busy = false
}) {
  const [otpSending, setOtpSending] = useState(false);
  const [otpHint, setOtpHint] = useState("");

  const sendOtp = useCallback(async () => {
    const email = String(businessEmail || "").trim();
    if (!isValidEmailShape(email)) {
      onEmailVerifyChange({ status: "error", message: "유효한 이메일을 입력해 주세요.", token: "" });
      return;
    }
    setOtpSending(true);
    setOtpHint("");
    try {
      const res = await fetch(apiUrl("/api/auth/signup-email/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "인증번호 발송에 실패했습니다.");
      if (data.devCode) {
        setOtpHint(`개발 모드 인증번호: ${data.devCode}`);
      } else {
        setOtpHint("인증번호를 메일함에서 확인해 주세요.");
      }
    } catch (e) {
      onEmailVerifyChange({
        status: "error",
        message: e instanceof Error ? e.message : "발송 실패",
        token: ""
      });
    } finally {
      setOtpSending(false);
    }
  }, [businessEmail, onEmailVerifyChange]);

  const verifyOtp = useCallback(async () => {
    const email = String(businessEmail || "").trim();
    const code = String(emailOtp || "").trim();
    if (!email || !code) {
      onEmailVerifyChange({ status: "error", message: "이메일과 인증번호를 입력해 주세요.", token: "" });
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/auth/signup-email/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "인증에 실패했습니다.");
      onEmailVerifyChange({ status: "ok", message: "이메일 인증 완료", token: data.token || "" });
    } catch (e) {
      onEmailVerifyChange({
        status: "error",
        message: e instanceof Error ? e.message : "인증 실패",
        token: ""
      });
    }
  }, [businessEmail, emailOtp, onEmailVerifyChange]);

  const trackA = signupTrack === "business_email";

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSignupTrackChange("business_email")}
          className={`rounded-full px-3.5 py-2 text-[12px] font-bold transition ${
            trackA
              ? "bg-[#191f28] text-white"
              : "border border-[#e5e8eb] bg-white text-[#4e5968]"
          }`}
        >
          비즈니스 메일 사용
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSignupTrackChange("vlue_id_only")}
          className={`rounded-full px-3.5 py-2 text-[12px] font-bold transition ${
            !trackA
              ? "bg-[#191f28] text-white"
              : "border border-[#e5e8eb] bg-white text-[#4e5968]"
          }`}
        >
          기존 이메일 없음
        </button>
      </div>

      {trackA ? (
        <div className="space-y-2">
          <p className="text-[11px] leading-relaxed text-slate-500">
            사용 중인 메일을 로그인 ID로 고정합니다. 가입 후 <b>@vlue.kr</b> 가상 메일이 자동 생성됩니다.
          </p>
          <input
            type="email"
            autoComplete="email"
            value={businessEmail}
            onChange={(e) => onBusinessEmailChange(e.target.value)}
            placeholder="예: ceo@gmail.com 또는 name@samsung.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#191f28]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={emailOtp}
              onChange={(e) => onEmailOtpChange(e.target.value)}
              placeholder="이메일 인증번호 6자리"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#191f28]"
            />
            <button
              type="button"
              disabled={busy || otpSending}
              onClick={sendOtp}
              className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-800"
            >
              {otpSending ? "발송 중…" : "인증번호"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={verifyOtp}
              className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-white"
            >
              확인
            </button>
          </div>
          {otpHint ? <p className="text-[10px] text-slate-500">{otpHint}</p> : null}
          {emailVerify.status === "ok" ? (
            <p className="text-[11px] font-bold text-emerald-700">{emailVerify.message}</p>
          ) : emailVerify.status === "error" ? (
            <p className="text-[11px] font-bold text-red-700">{emailVerify.message}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-[12px] text-slate-600">
            <input
              type="checkbox"
              checked
              readOnly
              className="mt-0.5"
            />
            이메일 없이 VLUE ID만으로 가입합니다 (휴대폰 인증만 필요)
          </label>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={desiredMemberId}
            onChange={(e) => onDesiredMemberIdChange(e.target.value)}
            placeholder="원하는 VLUE ID (예: hong_gildong)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#191f28]"
          />
          <p className="text-[10px] text-slate-500">영문 소문자 시작 · 3~20자 · 숫자 1자 이상</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRunCheckLoginId(normalizeMemberHandleSlug(desiredMemberId))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-800"
            >
              중복확인
            </button>
            {idCheck.status === "checking" ? (
              <span className="text-[11px] text-slate-500">확인 중…</span>
            ) : idCheck.status === "ok" ? (
              <span className="text-[11px] font-bold text-emerald-700">{idCheck.message}</span>
            ) : idCheck.status === "taken" || idCheck.status === "invalid" ? (
              <span className="text-[11px] font-bold text-red-700">{idCheck.message}</span>
            ) : null}
          </div>
          {!isValidMemberHandleSlug(normalizeMemberHandleSlug(desiredMemberId)) &&
          desiredMemberId.trim() ? (
            <p className="text-[10px] text-amber-700">ID 형식을 확인해 주세요.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
