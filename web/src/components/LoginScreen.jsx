import { useEffect, useState } from "react";
import VLUE_BRAND_LOGO from "../assets/vlue-shield-logo.svg?url";
import KakaoLoginButton from "./auth/KakaoLoginButton.jsx";
import GoogleLoginButton from "./auth/GoogleLoginButton.jsx";
import NaverLoginButton from "./auth/NaverLoginButton.jsx";
import InstagramLoginButton from "./auth/InstagramLoginButton.jsx";
import { VlueEyeMark } from "./VlueEyeMark.jsx";
import PasswordChangeSection from "./settings/PasswordChangeSection.jsx";
import { isPasswordChangeCertPending } from "../lib/passwordChangeApi.js";
import { sendAuthCode, EMAIL_AUTH_SUPPORT } from "../lib/emailAuthApi.js";

const SAVED_ID_KEY = "vlue_saved_login_id";
const SAVED_PASSWORD_KEY = "vlue_saved_login_password";
const REMEMBER_KEY = "vlue_remember_login";

/**
 * 앱 최초 진입용 로그인 화면
 * - 신규 가입은 휴대폰 본인인증(VLUE 회원가입)
 * - SNS는 가입 후 마이페이지 연동된 계정만 간편 로그인
 */
function LoginScreen({
  onLogin,
  onSignup,
  onSocialLogin,
  onDismiss,
  browsePrompt,
  snsUnlinkedAlert,
  onDismissSnsAlert
}) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [generalAuthOpen, setGeneralAuthOpen] = useState(false);
  const [hasRestoredLogin, setHasRestoredLogin] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pwEyeBlinkSeq, setPwEyeBlinkSeq] = useState(0);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [recoveryOpen, setRecoveryOpen] = useState(() => {
    try {
      return (
        isPasswordChangeCertPending() || sessionStorage.getItem("vlue_open_account_recovery") === "1"
      );
    } catch {
      return isPasswordChangeCertPending();
    }
  });
  const [recoveryDone, setRecoveryDone] = useState("");
  const [deviceEmailGate, setDeviceEmailGate] = useState(null);
  const [deviceEmailCode, setDeviceEmailCode] = useState("");
  const [deviceEmailHint, setDeviceEmailHint] = useState("");
  const [deviceConflict, setDeviceConflict] = useState(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("vlue_open_account_recovery") === "1") {
        setGeneralAuthOpen(true);
        setRecoveryOpen(true);
        sessionStorage.removeItem("vlue_open_account_recovery");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBER_KEY) === "1";
      const saved = localStorage.getItem(SAVED_ID_KEY) || "";
      const savedPw = localStorage.getItem(SAVED_PASSWORD_KEY) || "";
      setRememberLogin(remembered);
      if (remembered && saved) {
        setLoginId(saved);
        if (savedPw) setPassword(savedPw);
        setHasRestoredLogin(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const togglePasswordVisible = () => {
    setPwEyeBlinkSeq((n) => n + 1);
    setPasswordVisible((v) => !v);
  };

  const handleSubmitLogin = async (opts = {}) => {
    const id = String(loginId || "").trim();
    const pw = String(password || "").trim();
    if (!id || !pw) {
      setLoginError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    if (deviceEmailGate && String(deviceEmailCode || "").trim().length !== 6) {
      setLoginError("인증번호 6자리를 입력해 주세요.");
      return;
    }
    setLoginError("");
    setLoginBusy(true);
    try {
      const result = await onLogin?.({
        id,
        password: pw,
        rememberLogin,
        forceLogoutOther: Boolean(opts.forceLogoutOther),
        ...(deviceEmailGate
          ? { deviceEmailTicket: deviceEmailGate.ticket, emailCode: deviceEmailCode }
          : {})
      });
      if (result?.deviceConflict) {
        setDeviceConflict({
          message: result.message,
          activeDeviceLabel: result.activeDeviceLabel
        });
        setLoginError("");
        return;
      }
      if (result?.emailCodeRequired) {
        setDeviceEmailGate({
          ticket: result.ticket,
          maskedEmail: result.maskedEmail,
          message: result.message,
          supportEmail: result.supportEmail
        });
        setDeviceEmailCode("");
        setDeviceEmailHint(result.message || "");
        setLoginError("");
        setDeviceConflict(null);
        return;
      }
      if (result && result.ok === false) {
        setLoginError(result.error || "로그인에 실패했습니다.");
      } else {
        setDeviceEmailGate(null);
        setDeviceEmailCode("");
        setDeviceConflict(null);
      }
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "로그인할 수 없습니다.");
    } finally {
      setLoginBusy(false);
    }
  };

  const resendDeviceEmailCode = async () => {
    if (!deviceEmailGate?.ticket) return;
    setLoginBusy(true);
    setLoginError("");
    try {
      const data = await sendAuthCode({ purpose: "login_device", ticket: deviceEmailGate.ticket });
      setDeviceEmailHint(
        data.devCode
          ? `개발 모드 인증번호: ${data.devCode}`
          : `${data.maskedEmail || deviceEmailGate.maskedEmail} 로 인증번호를 다시 보냈습니다.`
      );
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "인증번호를 다시 보내지 못했습니다.");
    } finally {
      setLoginBusy(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#fafbfc] antialiased">
      <div className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-5">
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 shadow-sm active:scale-95"
          >
            둘러보기 계속
          </button>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain py-6 sm:py-8">
          {browsePrompt ? (
            <div className="mb-5 w-full max-w-[300px] rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-center text-[12px] font-semibold leading-relaxed text-blue-800 [word-break:keep-all]">
              {browsePrompt}
            </div>
          ) : null}
          <div className="flex w-full flex-col items-center px-1">
            <img src={VLUE_BRAND_LOGO} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-blue-900/10" draggable={false} />
            <h1 className="mt-4 text-[24px] font-bold tracking-tight text-slate-900">VLUE</h1>
            <p className="mt-2 w-full max-w-[300px] text-center text-[13px] font-normal leading-snug text-slate-600 [text-wrap:pretty] [word-break:keep-all] sm:max-w-[320px] sm:text-[14px] sm:leading-relaxed">
              검증된 연결로 대화하고, 비즈니스를 이어갑니다.
            </p>
          </div>

          {!generalAuthOpen ? (
            <div className="mt-7 flex w-full max-w-[300px] flex-col items-center">
              <p className="w-full text-center text-[12px] leading-relaxed text-slate-600 [word-break:keep-all]">
                간편 로그인은 휴대폰 본인인증 가입 후 마이페이지에서 SNS를 연동해야 사용할 수 있습니다.
              </p>
              <div className="mt-4 flex w-full flex-col gap-2.5">
                <KakaoLoginButton />
                <GoogleLoginButton />
                <NaverLoginButton />
                <InstagramLoginButton />
              </div>
              <button
                type="button"
                onClick={() => setGeneralAuthOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#2563EB] to-[#4F46E5] py-3 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99]"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm" aria-hidden>
                  <img src={VLUE_BRAND_LOGO} alt="" className="h-5 w-5 rounded" />
                </span>
                <span>VLUE 로그인 · 회원가입</span>
              </button>
              <p className="mt-3 w-full text-center text-[11px] leading-snug text-slate-500 [word-break:keep-all]">
                처음이라면 「VLUE 로그인 · 회원가입」에서 휴대폰 본인인증으로 가입해 주세요.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-7 w-full max-w-[300px]">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <input
                type="text"
                name="loginId"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="가입 시 설정한 아이디"
                className="w-full border-0 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none ring-0"
              />
              <div className="h-px bg-slate-100" />
              <div className="relative flex items-center">
                <input
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitLogin();
                  }}
                  placeholder="비밀번호"
                  className="w-full border-0 bg-white py-2.5 pl-3 pr-11 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none ring-0"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisible}
                  className="absolute right-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 active:scale-95"
                  aria-label={passwordVisible ? "비밀번호 숨기기" : "비밀번호 표시"}
                  title={passwordVisible ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  <VlueEyeMark
                    key={pwEyeBlinkSeq}
                    variant="header"
                    tone="muted"
                    svgWidth={22}
                    svgHeight={20}
                    wrapClassName={`vlue-header-eye-wrap vlue-login-pw-eye ${pwEyeBlinkSeq > 0 ? "vlue-header-eye-wrap--nav-loading" : ""}`}
                  />
                </button>
              </div>
                </div>
                {deviceEmailGate ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
                    <p className="text-[12px] font-semibold leading-relaxed text-blue-900" style={{ wordBreak: "keep-all" }}>
                      새 기기 확인 — {deviceEmailGate.maskedEmail} 로 보낸 6자리 인증번호를 입력해 주세요.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={deviceEmailCode}
                      onChange={(e) => setDeviceEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="인증번호 6자리"
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-[14px] outline-none"
                    />
                    {deviceEmailHint ? (
                      <p className="text-[11px] leading-snug text-blue-800">{deviceEmailHint}</p>
                    ) : null}
                    <p className="text-[11px] leading-snug text-slate-500" style={{ wordBreak: "keep-all" }}>
                      {EMAIL_AUTH_SUPPORT}
                    </p>
                    <button
                      type="button"
                      disabled={loginBusy}
                      onClick={resendDeviceEmailCode}
                      className="text-[11px] font-medium text-blue-700 underline-offset-2 hover:underline"
                    >
                      인증번호 다시 받기
                    </button>
                  </div>
                ) : null}
                {loginError ? (
                  <p className="mt-2 text-center text-[12px] font-medium leading-snug text-rose-600" role="alert">
                    {loginError}
                  </p>
                ) : null}
                {recoveryDone ? (
                  <p className="mt-2 text-center text-[12px] font-medium leading-snug text-emerald-600" role="status">
                    {recoveryDone}
                  </p>
                ) : null}

                <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-blue-600"
                  />
                  <span className="min-w-0 leading-snug">아이디·비밀번호 저장</span>
                </label>
                {hasRestoredLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginId("");
                      setPassword("");
                      setHasRestoredLogin(false);
                      try {
                        localStorage.removeItem(SAVED_ID_KEY);
                        localStorage.removeItem(SAVED_PASSWORD_KEY);
                        localStorage.removeItem(REMEMBER_KEY);
                      } catch {
                        /* ignore */
                      }
                      setRememberLogin(false);
                    }}
                    className="mt-1.5 text-left text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                  >
                    다른 아이디로 로그인
                  </button>
                )}

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setRecoveryOpen(true)}
                    className="text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                  >
                    아이디 / 비밀번호 찾기
                  </button>
                </div>
              </div>

              <div className="mt-4 w-full max-w-[300px]">
                <button
                  type="button"
                  onClick={() => void handleSubmitLogin()}
                  disabled={loginBusy}
                  className="w-full rounded-lg bg-blue-600 py-2 text-[13px] font-semibold text-white transition active:scale-[0.99] active:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
                >
                  {loginBusy ? "로그인 중…" : deviceEmailGate ? "인증 후 로그인" : "로그인"}
                </button>
                <button
                  type="button"
                  onClick={onSignup}
                  className="mt-1.5 w-full rounded-lg border border-indigo-600 bg-indigo-600 py-2 text-[13px] font-semibold text-white shadow-sm transition active:scale-[0.99] hover:bg-indigo-700"
                >
                  회원가입
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginError("");
                    setGeneralAuthOpen(false);
                  }}
                  className="mt-3 w-full py-1 text-[12px] font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  간편 로그인으로 돌아가기
                </button>
              </div>
            </>
          )}
        </div>

        <p className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center text-[11px] font-medium leading-snug text-slate-400">
          © 2026 VLUE Inc. · VCID KOREA
        </p>
      </div>

      {recoveryOpen ? (
        <PasswordChangeSection
          variant="overlay"
          loggedIn={false}
          handle={loginId}
          onBack={() => setRecoveryOpen(false)}
          onSuccess={(msg) => {
            setRecoveryOpen(false);
            setLoginError("");
            setGeneralAuthOpen(true);
            setRecoveryDone(msg || "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
          }}
        />
      ) : null}

      {snsUnlinkedAlert ? (
        <div className="fixed inset-0 z-[30] flex items-center justify-center bg-black/40 px-6" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-[320px] rounded-2xl bg-white px-5 py-6 shadow-xl">
            <p className="text-center text-[15px] font-bold leading-snug text-slate-900 [word-break:keep-all]">
              이 SNS 계정과 연동되어 있지 않습니다.
            </p>
            <p className="mt-3 text-center text-[13px] leading-relaxed text-slate-600 [word-break:keep-all]">
              최초 1회 휴대폰 본인인증으로 가입한 뒤, [마이페이지 &gt; 소셜 로그인 연동]에서 SNS 계정을 연결하면 간편 로그인할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => onDismissSnsAlert?.()}
              className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-[15px] font-semibold text-white"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}

      {deviceConflict ? (
        <div
          className="fixed inset-0 z-[35] flex items-center justify-center bg-black/45 px-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="device-conflict-title"
        >
          <div className="w-full max-w-[320px] rounded-2xl bg-white px-5 py-6 shadow-xl">
            <p
              id="device-conflict-title"
              className="text-center text-[15px] font-bold leading-snug text-slate-900 [word-break:keep-all]"
            >
              다른 기기에서 접속 중
            </p>
            <p className="mt-3 text-center text-[13px] leading-relaxed text-slate-600 [word-break:keep-all]">
              {deviceConflict.message ||
                `다른 기기에서 접속 중입니다. (${deviceConflict.activeDeviceLabel || "다른 기기"}) 로그아웃 하시겠습니까?`}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={loginBusy}
                onClick={() => setDeviceConflict(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-[14px] font-semibold text-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                disabled={loginBusy}
                onClick={() => {
                  setDeviceConflict(null);
                  void handleSubmitLogin({ forceLogoutOther: true });
                }}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-[14px] font-semibold text-white disabled:opacity-70"
              >
                {loginBusy ? "처리 중…" : "로그아웃 후 로그인"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

export default LoginScreen;
