import { useCallback, useEffect, useState } from "react";
import { sendAuthCode, verifyAuthCode, EMAIL_AUTH_SUPPORT } from "../lib/emailAuthApi.js";
import { isValidMemberHandleSlug, normalizeMemberHandleSlug } from "../lib/memberHandleRules.js";

function isValidEmailShape(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isPlatformSignupEmail(email) {
  const domain = String(email || "")
    .trim()
    .toLowerCase()
    .split("@")[1];
  if (!domain) return false;
  return domain === "vlue.kr" || domain.endsWith(".vlue.kr");
}

/**
 * 회원가입 — VLUE ID + 이메일 인증(필수) + 휴대폰 PASS(다음 단계)
 */
export default function TwoTrackSignupFields({
  signupEmail,
  onSignupEmailChange,
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
    const email = String(signupEmail || "").trim();
    if (!isValidEmailShape(email)) {
      onEmailVerifyChange({ status: "error", message: "유효한 이메일을 입력해 주세요.", token: "" });
      return;
    }
    if (isPlatformSignupEmail(email)) {
      onEmailVerifyChange({
        status: "error",
        message: "@vlue.kr 주소는 가입에 사용할 수 없습니다. 개인 또는 회사 메일을 사용해 주세요.",
        token: ""
      });
      return;
    }
    setOtpSending(true);
    setOtpHint("");
    try {
      const data = await sendAuthCode({ email, purpose: "signup" });
      if (data.devCode) {
        setOtpHint(`개발 모드 인증번호: ${data.devCode}`);
      } else {
        setOtpHint(`인증번호를 메일함(또는 스팸함)에서 확인해 주세요. 5분 내에 입력해 주세요.`);
      }
    } catch (e) {
      setOtpHint("");
      onEmailVerifyChange({
        status: "error",
        message: e instanceof Error ? e.message : "발송 실패",
        token: ""
      });
    } finally {
      setOtpSending(false);
    }
  }, [signupEmail, onEmailVerifyChange]);

  const verifyOtp = useCallback(async () => {
    const email = String(signupEmail || "").trim();
    const code = String(emailOtp || "").trim();
    if (!email || !code) {
      onEmailVerifyChange({ status: "error", message: "이메일과 인증번호를 입력해 주세요.", token: "" });
      return;
    }
    try {
      const data = await verifyAuthCode({ email, code, purpose: "signup" });
      onEmailVerifyChange({ status: "ok", message: "이메일 인증 완료", token: data.token || "" });
    } catch (e) {
      onEmailVerifyChange({
        status: "error",
        message: e instanceof Error ? e.message : "인증 실패",
        token: ""
      });
    }
  }, [signupEmail, emailOtp, onEmailVerifyChange]);

  useEffect(() => {
    const slug = normalizeMemberHandleSlug(desiredMemberId);
    if (!slug) {
      return undefined;
    }
    if (!isValidMemberHandleSlug(slug)) {
      return undefined;
    }
    const t = setTimeout(() => onRunCheckLoginId(slug), 450);
    return () => clearTimeout(t);
  }, [desiredMemberId, onRunCheckLoginId]);

  return (
    <div className="mt-4 space-y-4">
      <p className="text-[11px] leading-relaxed text-slate-500">
        휴대폰 본인인증과 이메일 인증이 모두 필요합니다. 이메일은 비밀번호 찾기·계정 복구에 사용됩니다.
      </p>

      <div className="space-y-2">
        <label className="block text-[11px] font-medium text-slate-600">VLUE ID</label>
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
            className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-medium text-slate-800"
          >
            중복확인
          </button>
          {idCheck.status === "checking" ? (
            <span className="text-[11px] text-slate-500">확인 중…</span>
          ) : idCheck.status === "ok" ? (
            <span className="text-[11px] font-medium text-emerald-700">{idCheck.message}</span>
          ) : idCheck.status === "taken" || idCheck.status === "invalid" ? (
            <span className="text-[11px] font-medium text-red-700">{idCheck.message}</span>
          ) : null}
        </div>
        {!isValidMemberHandleSlug(normalizeMemberHandleSlug(desiredMemberId)) && desiredMemberId.trim() ? (
          <p className="text-[10px] text-amber-700">ID 형식을 확인해 주세요.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-medium text-slate-600">이메일</label>
        <input
          type="email"
          autoComplete="email"
          value={signupEmail}
          onChange={(e) => {
            onSignupEmailChange(e.target.value);
            onEmailVerifyChange({ status: "idle", message: "", token: "" });
          }}
          placeholder="예: name@gmail.com, name@company.com"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#191f28]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={emailOtp}
            onChange={(e) => onEmailOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="이메일 인증번호 6자리"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#191f28]"
          />
          <button
            type="button"
            disabled={busy || otpSending}
            onClick={sendOtp}
            className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-medium text-slate-800"
          >
            {otpSending ? "발송 중…" : "인증번호"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={verifyOtp}
            className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-medium text-white"
          >
            확인
          </button>
        </div>
        {otpHint ? <p className="text-[10px] text-slate-500">{otpHint}</p> : null}
        <p className="text-[10px] leading-snug text-slate-400" style={{ wordBreak: "keep-all" }}>
          {EMAIL_AUTH_SUPPORT}
        </p>
        {emailVerify.status === "ok" ? (
          <p className="text-[11px] font-medium text-emerald-700">{emailVerify.message}</p>
        ) : emailVerify.status === "error" ? (
          <p className="text-[11px] font-medium text-red-700">{emailVerify.message}</p>
        ) : null}
      </div>
    </div>
  );
}
