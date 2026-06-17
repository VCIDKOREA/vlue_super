import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../lib/apiBase.js";
import { isValidMemberHandleSlug, normalizeMemberHandleSlug } from "../lib/memberHandleRules.js";
import { VIRTUAL_ID_CONFLICT_MESSAGE } from "../lib/vlueSignupMessages.js";

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
  businessVirtualId,
  onBusinessVirtualIdChange,
  virtualIdCheck,
  onVirtualIdCheckChange,
  onRunCheckVirtualId,
  needsCustomVirtualId,
  onNeedsCustomVirtualIdChange,
  desiredMemberId,
  onDesiredMemberIdChange,
  idCheck,
  onRunCheckLoginId,
  busy = false
}) {
  const [otpSending, setOtpSending] = useState(false);
  const [otpHint, setOtpHint] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const previewVirtualFromEmail = useCallback(
    async (email) => {
      const trimmed = String(email || "").trim();
      if (!isValidEmailShape(trimmed)) {
        onNeedsCustomVirtualIdChange(false);
        onVirtualIdCheckChange({ status: "idle", message: "", normalized: "", fullVirtualEmail: "" });
        return;
      }
      setPreviewing(true);
      try {
        const res = await fetch(
          apiUrl(`/api/auth/check-virtual-email-id?email=${encodeURIComponent(trimmed)}`)
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "주소 확인에 실패했습니다.");

        if (data.available && data.normalized) {
          onNeedsCustomVirtualIdChange(false);
          onBusinessVirtualIdChange(data.normalized);
          onVirtualIdCheckChange({
            status: "ok",
            message: `발급 예정: ${data.fullVirtualEmail || `${data.normalized}@vlue.kr`}`,
            normalized: data.normalized,
            fullVirtualEmail: data.fullVirtualEmail || ""
          });
        } else if (data.code === "EMAIL_TAKEN") {
          onNeedsCustomVirtualIdChange(false);
          onVirtualIdCheckChange({
            status: "error",
            message: data.reason || "이미 가입된 이메일입니다.",
            normalized: "",
            fullVirtualEmail: ""
          });
        } else {
          onNeedsCustomVirtualIdChange(true);
          onBusinessVirtualIdChange("");
          onVirtualIdCheckChange({
            status: "conflict",
            message: data.reason || VIRTUAL_ID_CONFLICT_MESSAGE,
            normalized: data.suggestedPrefix || "",
            fullVirtualEmail: data.fullVirtualEmail || ""
          });
        }
      } catch (e) {
        onVirtualIdCheckChange({
          status: "error",
          message: e instanceof Error ? e.message : "주소 확인 실패",
          normalized: "",
          fullVirtualEmail: ""
        });
      } finally {
        setPreviewing(false);
      }
    },
    [
      onBusinessVirtualIdChange,
      onNeedsCustomVirtualIdChange,
      onVirtualIdCheckChange
    ]
  );

  useEffect(() => {
    if (signupTrack !== "business_email") return;
    const t = setTimeout(() => previewVirtualFromEmail(businessEmail), 400);
    return () => clearTimeout(t);
  }, [businessEmail, signupTrack, previewVirtualFromEmail]);

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
      await previewVirtualFromEmail(email);
    } catch (e) {
      onEmailVerifyChange({
        status: "error",
        message: e instanceof Error ? e.message : "인증 실패",
        token: ""
      });
    }
  }, [businessEmail, emailOtp, onEmailVerifyChange, previewVirtualFromEmail]);

  const trackA = signupTrack === "business_email";

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSignupTrackChange("business_email")}
          className={`rounded-full px-3.5 py-2 text-[11px] font-semibold transition sm:text-[12px] ${
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
          className={`rounded-full px-3.5 py-2 text-[11px] font-semibold transition sm:text-[12px] ${
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
            로그인은 <b>기존 메일</b>로, 발급 주소는 <b>@vlue.kr</b> 가상 메일입니다.
          </p>
          <input
            type="email"
            autoComplete="email"
            value={businessEmail}
            onChange={(e) => {
              onBusinessEmailChange(e.target.value);
              onEmailVerifyChange({ status: "idle", message: "", token: "" });
            }}
            placeholder="예: gildong@naver.com 또는 name@samsung.com"
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
          {emailVerify.status === "ok" ? (
            <p className="text-[11px] font-medium text-emerald-700">{emailVerify.message}</p>
          ) : emailVerify.status === "error" ? (
            <p className="text-[11px] font-medium text-red-700">{emailVerify.message}</p>
          ) : null}

          {previewing ? (
            <p className="text-[11px] text-slate-500">@vlue.kr 주소 확인 중…</p>
          ) : null}

          {!needsCustomVirtualId && virtualIdCheck.status === "ok" ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-800">
              {virtualIdCheck.message}
            </p>
          ) : null}

          {needsCustomVirtualId ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 space-y-2">
              <p className="text-[11px] font-medium leading-relaxed text-amber-900">
                {virtualIdCheck.message || VIRTUAL_ID_CONFLICT_MESSAGE}
              </p>
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={businessVirtualId}
                onChange={(e) => {
                  onBusinessVirtualIdChange(e.target.value);
                  onVirtualIdCheckChange({ status: "idle", message: "", normalized: "", fullVirtualEmail: "" });
                }}
                placeholder="원하는 비즈니스 메일 ID (예: gildong77)"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#191f28]"
              />
              <p className="text-[10px] text-amber-800">영문 소문자 시작 · 3~20자 · 숫자 1자 이상</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRunCheckVirtualId(normalizeMemberHandleSlug(businessVirtualId))}
                  className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-[11px] font-bold text-amber-950"
                >
                  중복확인
                </button>
                {virtualIdCheck.status === "checking" ? (
                  <span className="text-[11px] text-slate-500">확인 중…</span>
                ) : virtualIdCheck.status === "ok" ? (
                  <span className="text-[11px] font-medium text-emerald-700">{virtualIdCheck.message}</span>
                ) : virtualIdCheck.status === "error" || virtualIdCheck.status === "conflict" ? (
                  <span className="text-[11px] font-medium text-red-700">{virtualIdCheck.message}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {virtualIdCheck.status === "error" && !needsCustomVirtualId ? (
            <p className="text-[11px] font-bold text-red-700">{virtualIdCheck.message}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-[12px] text-slate-600">
            <input type="checkbox" checked readOnly className="mt-0.5" />
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
      )}
    </div>
  );
}
