import { useEffect, useRef, useState } from "react";
import VLUE_BRAND_LOGO from "../assets/vlue-shield-logo.svg?url";
import KakaoLoginButton from "./auth/KakaoLoginButton.jsx";
import GoogleLoginButton from "./auth/GoogleLoginButton.jsx";
import NaverLoginButton from "./auth/NaverLoginButton.jsx";
import InstagramLoginButton from "./auth/InstagramLoginButton.jsx";
import { VlueEyeMark } from "./VlueEyeMark.jsx";
import PasswordChangeSection from "./settings/PasswordChangeSection.jsx";
import { isPasswordChangeCertPending } from "../lib/passwordChangeApi.js";
import { sendAuthCode, EMAIL_AUTH_SUPPORT } from "../lib/emailAuthApi.js";
import { UNREGISTERED_SNS_TOAST_MESSAGE } from "../lib/socialLoginPolicy.js";

const SAVED_ID_KEY = "vlue_saved_login_id";
const SAVED_PASSWORD_KEY = "vlue_saved_login_password";
const REMEMBER_KEY = "vlue_remember_login";

/**
 * 앱 최초 진입용 로그인 화면 (3원화 UI + 화면 전환 UX + 소셜 로그인 예외 처리)
 * 1) [최초 회원가입 (본인인증)] (1순위 - 메인 CTA) -> 전체 화면 전환 (Page Navigation)
 * 2) [VLUÉ 전용 로그인] (2순위 - 보조 버튼) -> 중앙 팝업 모달 (Center Pop-up Dialog)
 * 3) [SNS 간편로그인] (3순위 - 세컨더리 영역) -> 중앙 팝업 모달 / Bottom Sheet
 * + 미가입 유저 간편로그인 실패 시 안내 토스트 + 최상단 가입 버튼 Shake/Pulse 포커스 애니메이션
 */
function LoginScreen({
  onLogin,
  onSignup,
  onSocialLogin,
  onDismiss,
  browsePrompt,
  snsUnlinkedAlert,
  onDismissSnsAlert,
  signupHighlightTrigger = 0,
  initialToast = "",
  onClearToast
}) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [hasRestoredLogin, setHasRestoredLogin] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pwEyeBlinkSeq, setPwEyeBlinkSeq] = useState(0);
  const [loginBusy, setLoginBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState("");
  const [loginError, setLoginError] = useState("");

  // 모달 상태 (VLUÉ 전용 로그인 모달 & SNS 간편로그인 모달)
  const [vlueLoginModalOpen, setVlueLoginModalOpen] = useState(false);
  const [snsModalOpen, setSnsModalOpen] = useState(false);

  // 시각적 포커스 애니메이션 (Shake/Pulse) & 안내 토스트
  const [isSignupHighlighted, setIsSignupHighlighted] = useState(false);
  const [toastMessage, setToastMessage] = useState(initialToast || "");
  const signupBtnRef = useRef(null);

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

  // 계정 복구 리다이렉트 진입 확인
  useEffect(() => {
    try {
      if (sessionStorage.getItem("vlue_open_account_recovery") === "1") {
        setVlueLoginModalOpen(true);
        setRecoveryOpen(true);
        sessionStorage.removeItem("vlue_open_account_recovery");
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 저장된 로그인 정보 복원
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

  // 외부 initialToast 변경 반영
  useEffect(() => {
    if (initialToast) {
      setToastMessage(initialToast);
      const timer = setTimeout(() => {
        setToastMessage("");
        onClearToast?.();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [initialToast, onClearToast]);

  // 간편 로그인 미가입자 튕김 복귀 시 포커스 애니메이션 및 안내 토스트 실행
  const triggerSignupFocusEffect = (msg = UNREGISTERED_SNS_TOAST_MESSAGE) => {
    // 1. 모달이 열려 있다면 즉시 닫고 안전하게 첫 화면 복귀
    setSnsModalOpen(false);
    setVlueLoginModalOpen(false);

    // 2. 안내 토스트 출력
    setToastMessage(msg);

    // 3. 최상단 회원가입 버튼 시각적 포커스 (Shake + Pulse 애니메이션 1.8초간 부여)
    setIsSignupHighlighted(true);
    try {
      signupBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      /* ignore */
    }

    const animTimer = setTimeout(() => {
      setIsSignupHighlighted(false);
    }, 1800);

    const toastTimer = setTimeout(() => {
      setToastMessage("");
      onClearToast?.();
    }, 4500);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(toastTimer);
    };
  };

  useEffect(() => {
    if (signupHighlightTrigger > 0) {
      triggerSignupFocusEffect();
    }
  }, [signupHighlightTrigger]);

  // 이전 snsUnlinkedAlert prop 수신 시에도 토스트 및 버튼 하이라이트로 부드럽게 유도
  useEffect(() => {
    if (snsUnlinkedAlert) {
      triggerSignupFocusEffect(UNREGISTERED_SNS_TOAST_MESSAGE);
      onDismissSnsAlert?.();
    }
  }, [snsUnlinkedAlert, onDismissSnsAlert]);

  const togglePasswordVisible = () => {
    setPwEyeBlinkSeq((n) => n + 1);
    setPasswordVisible((v) => !v);
  };

  const handleStartSignup = () => {
    setVlueLoginModalOpen(false);
    setSnsModalOpen(false);
    onSignup?.("general");
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
        setVlueLoginModalOpen(false);
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
    <div className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#fafbfc] antialiased selection:bg-blue-100">
      <style>{`
        @keyframes vlueShakePulse {
          0% {
            transform: scale(1) translateX(0);
            box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.25);
          }
          15% {
            transform: scale(1.03) translateX(-6px);
            box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.45);
          }
          30% {
            transform: scale(1.03) translateX(6px);
            box-shadow: 0 0 0 10px rgba(37, 99, 235, 0.35);
          }
          45% {
            transform: scale(1.03) translateX(-5px);
            box-shadow: 0 0 0 12px rgba(37, 99, 235, 0.25);
          }
          60% {
            transform: scale(1.03) translateX(5px);
            box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.2);
          }
          75% {
            transform: scale(1.02) translateX(-2px);
            box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.15);
          }
          90% {
            transform: scale(1.01) translateX(2px);
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
          }
          100% {
            transform: scale(1) translateX(0);
            box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.25);
          }
        }
      `}</style>

      {/* 상단 둘러보기 버튼 */}
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

        {/* 첫 화면 메인 영역 */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain py-6 sm:py-8">
          {browsePrompt ? (
            <div className="mb-5 w-full max-w-[320px] rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-center text-[12px] font-semibold leading-relaxed text-blue-800 [word-break:keep-all]">
              {browsePrompt}
            </div>
          ) : null}

          {/* 미가입 상태에서 소셜 시도 후 복귀 시 상단 알림 배너 */}
          {Boolean(isSignupHighlighted || toastMessage) && (
            <div className="mb-4 w-full max-w-[320px] rounded-2xl border border-blue-200 bg-blue-50/95 p-3.5 shadow-xs text-center animate-fade-in [word-break:keep-all]">
              <div className="flex items-center justify-center gap-1.5 text-blue-900 font-bold text-[13px]">
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>가입된 계정이 없습니다</span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-blue-800">
                VLUÉ는 안전한 연결을 위해 최초 1회 <strong>본인인증 가입</strong>이 필수입니다. 아래 버튼을 눌러 회원가입을 완료해 주세요.
              </p>
            </div>
          )}

          {/* VLUÉ 브랜드 헤더 */}
          <div className="flex w-full flex-col items-center px-1">
            <img
              src={VLUE_BRAND_LOGO}
              alt="VLUÉ"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-blue-900/10"
              draggable={false}
            />
            <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-slate-900">VLUÉ</h1>
            <p className="mt-2 w-full max-w-[300px] text-center text-[13px] font-normal leading-snug text-slate-600 [text-wrap:pretty] [word-break:keep-all] sm:max-w-[320px] sm:text-[14px] sm:leading-relaxed">
              검증된 연결로 대화하고, 비즈니스를 이어갑니다.
            </p>
          </div>

          {/* ============================================================== */}
          {/* 3원화 진입 UI (Top to Bottom 순서 배치)                         */}
          {/* ============================================================== */}
          <div className="mt-8 flex w-full max-w-[320px] flex-col items-center gap-3">
            {/* 1) [최초 회원가입 (본인인증)] (1순위 - 메인 CTA) */}
            <div className="w-full">
              <button
                ref={signupBtnRef}
                type="button"
                onClick={handleStartSignup}
                style={
                  isSignupHighlighted
                    ? { animation: "vlueShakePulse 1.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) both" }
                    : undefined
                }
                className={[
                  "group relative flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 px-4 text-[15px] font-bold text-white transition",
                  "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:from-[#1D4ED8] hover:to-[#4338CA]",
                  "shadow-md shadow-blue-500/25 active:scale-[0.99]",
                  isSignupHighlighted ? "ring-4 ring-blue-400/60 brightness-105" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label="최초 회원가입 (본인인증)"
              >
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-white shadow-xs"
                  aria-hidden
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H3a1 1 0 110-2h6V3a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span>아이디 회원가입</span>
              </button>
              <p className="mt-1.5 text-center text-[11px] font-medium leading-tight text-blue-700/80 [word-break:keep-all]">
                카카오·네이버·Google로 바로 간편 가입할 수 있습니다. DCC 발급 시에만 본인인증이 필요합니다.
              </p>
            </div>

            {/* 2) [VLUÉ 전용 로그인] (2순위 - 보조 버튼) */}
            <div className="w-full pt-1">
              <button
                type="button"
                onClick={() => {
                  setLoginError("");
                  setVlueLoginModalOpen(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3.5 px-4 text-[15px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-500" aria-hidden>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span>VLUÉ 전용 로그인</span>
              </button>
              <p className="mt-1.5 text-center text-[11px] font-normal leading-tight text-slate-500 [word-break:keep-all]">
                가입 완료된 VLUÉ 아이디 · 비밀번호로 로그인
              </p>
            </div>

            {/* 3) [SNS 간편로그인] (3순위 - 세컨더리 영역) */}
            <div className="w-full pt-2">
              <button
                type="button"
                onClick={() => {
                  setSnsModalOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/90 py-3 px-4 text-[14px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <span>SNS 간편로그인</span>
                </span>
                <span className="flex items-center gap-1.5" aria-hidden>
                  {/* 카카오 미니 배지 */}
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-[#FEE500] text-[10px] font-black text-[#191919]">
                    K
                  </span>
                  {/* Google 미니 배지 */}
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-slate-200 bg-white">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </span>
                  {/* 네이버 미니 배지 */}
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-[#03C75A] text-[10px] font-black text-white">
                    N
                  </span>
                  {/* 인스타그램 미니 배지 */}
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2.2" />
                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2.2" />
                    </svg>
                  </span>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="ml-1 h-4 w-4 text-slate-400">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>
              <p className="mt-1.5 text-center text-[10.5px] font-normal leading-tight text-slate-400 [word-break:keep-all]">
                본인인증 가입 후 마이페이지에서 SNS를 연동한 기존 회원 전용
              </p>
            </div>
          </div>
        </div>

        {/* 카피라이트 */}
        <p className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center text-[11px] font-medium leading-snug text-slate-400">
          © 2026 VLUÉ Inc. · VCID KOREA
        </p>
      </div>

      {/* ============================================================== */}
      {/* 2) [VLUÉ 전용 로그인] 중앙 팝업 모달 (Center Pop-up Dialog)      */}
      {/* ============================================================== */}
      {vlueLoginModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vlue-login-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVlueLoginModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-[340px] rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:p-7">
            {/* 상단 타이틀 & 닫기 [X] 버튼 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 id="vlue-login-modal-title" className="text-[17px] font-bold text-slate-900">
                  VLUÉ 전용 로그인
                </h2>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                  가입하신 아이디와 비밀번호를 입력해 주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVlueLoginModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                aria-label="닫기"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 입력 폼 */}
            <div className="mt-4">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                <input
                  type="text"
                  name="loginId"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="가입 시 설정한 아이디"
                  className="w-full border-0 bg-white px-3.5 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none ring-0"
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
                    className="w-full border-0 bg-white py-3 pl-3.5 pr-11 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none ring-0"
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

              {/* 새 기기 이메일 2단계 인증 게이트 */}
              {deviceEmailGate ? (
                <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
                  <p className="text-[12px] font-semibold leading-relaxed text-blue-900 [word-break:keep-all]">
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
                  <p className="text-[11px] leading-snug text-slate-500 [word-break:keep-all]">
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

              {/* 옵션 및 링크 */}
              <div className="mt-3 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>아이디 저장</span>
                </label>
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(true)}
                  className="text-[11.5px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                >
                  아이디 / 비밀번호 찾기
                </button>
              </div>

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
                  className="mt-1 text-left text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                >
                  다른 아이디로 로그인
                </button>
              )}

              {/* 로그인 액션 버튼 */}
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => void handleSubmitLogin()}
                  disabled={loginBusy}
                  className="w-full rounded-xl bg-blue-600 py-3 text-[14px] font-bold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 shadow-sm"
                >
                  {loginBusy ? "로그인 중…" : deviceEmailGate ? "인증 후 로그인" : "로그인"}
                </button>
              </div>

              {/* 하단 회원가입 전환 링크 */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <span className="text-[12px] text-slate-500">계정이 없으신가요? </span>
                <button
                  type="button"
                  onClick={handleStartSignup}
                  className="text-[12px] font-bold text-indigo-600 hover:underline"
                >
                  최초 회원가입 (본인인증)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ============================================================== */}
      {/* 3) [SNS 간편로그인] 중앙 팝업 모달 / Bottom Sheet              */}
      {/* ============================================================== */}
      {snsModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sns-login-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSnsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-[340px] rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 sm:p-7">
            {/* 상단 타이틀 & 닫기 [X] 버튼 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 id="sns-login-modal-title" className="text-[17px] font-bold text-slate-900">
                  SNS 간편로그인
                </h2>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                  마이페이지에 연동된 소셜 계정으로 로그인합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSnsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                aria-label="닫기"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 미가입자를 위한 최초 회원가입 우선 안내 박스 및 버튼 */}
            <div className="mt-3.5 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-center [word-break:keep-all]">
              <p className="text-[12.5px] font-bold text-blue-950">
                처음 설치하셨거나 가입 전이신가요?
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-blue-800">
                소셜 로그인은 가입 후 마이페이지에서 연동한 회원만 가능합니다.
              </p>
              <button
                type="button"
                onClick={handleStartSignup}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] py-2.5 px-3 text-[13px] font-bold text-white shadow-md shadow-blue-500/20 hover:from-[#1D4ED8] hover:to-[#4338CA] active:scale-[0.99] transition"
              >
                <span>최초 본인인증 회원가입하기</span>
                <span aria-hidden>→</span>
              </button>
            </div>

            {/* 구분선 */}
            <div className="mt-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-medium text-slate-400">기존 연동 회원 간편로그인</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* 소셜 로그인 버튼 리스트 (카카오, 구글, 네이버, 인스타그램) */}
            <div className="mt-3 flex flex-col gap-2.5">
              <KakaoLoginButton
                disabled={Boolean(socialBusy)}
                pending={socialBusy === "kakao"}
                onBeforeNavigate={() => setSocialBusy("kakao")}
              />
              <GoogleLoginButton
                disabled={Boolean(socialBusy)}
                pending={socialBusy === "google"}
                onBeforeNavigate={() => setSocialBusy("google")}
              />
              <NaverLoginButton
                disabled={Boolean(socialBusy)}
                pending={socialBusy === "naver"}
                onBeforeNavigate={() => setSocialBusy("naver")}
              />
              <InstagramLoginButton
                disabled={Boolean(socialBusy)}
                pending={socialBusy === "instagram"}
                onBeforeNavigate={() => setSocialBusy("instagram")}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ============================================================== */}
      {/* 안내 토스트 (Toast/Snackbar) - 미가입 유저 간편로그인 실패 시 노출  */}
      {/* ============================================================== */}
      {toastMessage ? (
        <div
          className="fixed bottom-6 inset-x-4 mx-auto max-w-sm z-[90] flex items-center justify-between gap-2.5 rounded-2xl bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-900 text-[11px] font-black">
              !
            </span>
            <span className="text-[12.5px] font-semibold leading-snug text-slate-100 [word-break:keep-all]">
              {toastMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="shrink-0 p-1 text-slate-400 hover:text-white"
            aria-label="토스트 닫기"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ) : null}

      {/* 비밀번호 변경 / 계정 복구 오버레이 */}
      {recoveryOpen ? (
        <PasswordChangeSection
          variant="overlay"
          loggedIn={false}
          handle={loginId}
          onBack={() => setRecoveryOpen(false)}
          onSuccess={(msg) => {
            setRecoveryOpen(false);
            setLoginError("");
            setVlueLoginModalOpen(true);
            setRecoveryDone(msg || "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
          }}
        />
      ) : null}

      {/* 중복 기기 접속 시 알림 모달 */}
      {deviceConflict ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="device-conflict-title"
        >
          <div className="w-full max-w-[320px] rounded-2xl bg-white p-6 shadow-2xl">
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
