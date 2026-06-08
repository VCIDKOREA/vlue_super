import { useEffect, useState } from "react";
import VLUE_BRAND_LOGO from "../assets/vlue-shield-logo.svg?url";
import { buildKakaoLoginDiagnosticsText } from "../lib/kakaoLoginDiagnostics.js";
import { getKakaoOAuthRedirectUri } from "../lib/kakaoSocialLogin.js";
import KakaoLoginButton from "./auth/KakaoLoginButton.jsx";
import { VlueEyeMark } from "./VlueEyeMark.jsx";
import { SOCIAL_LOGIN_POLICY_HINT } from "../lib/socialLoginPolicy.js";

const SAVED_ID_KEY = "vlue_saved_login_id";
const SAVED_PASSWORD_KEY = "vlue_saved_login_password";
const REMEMBER_KEY = "vlue_remember_login";

function SocialGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SocialNaver() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#03C75A] text-[17px] font-black text-white" aria-hidden>
      N
    </span>
  );
}

function SocialApple() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#000000" />
      <path
        fill="#ffffff"
        d="M16.36 12.55c-.02-2.7 2.2-4.01 2.25-4.04-1.23-1.8-3.12-2.04-3.8-2.06-1.62-.17-3.17.95-4 .95-.82 0-2.09-.93-3.44-.9-1.77.03-3.4 1.03-4.31 2.62-1.84 3.18-.47 7.9 1.32 10.5.87 1.26 1.9 2.67 3.26 2.62 1.3-.05 1.8-.84 3.38-.84s2.03.84 3.42.81c1.41-.03 2.3-1.28 3.16-2.53.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.11zM13.7 8.05c.9-1.09 1.51-2.6 1.34-4.11-1.29.05-2.85.86-3.78 1.95-.83.96-1.56 2.5-1.37 3.98 1.45.11 2.93-.73 3.81-1.82z"
      />
    </svg>
  );
}

function SocialPass() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-700 text-[9px] font-black leading-tight tracking-tight text-white ring-1 ring-violet-900/15">
      PASS
    </div>
  );
}

/**
 * 앱 최초 진입용 로그인 화면
 * - 간편 로그인은 팝업으로만 제공 (이미 가입한 사용자용)
 * - 아이디·비밀번호 저장 체크 후 로그인 시 다음 접속에서 둘 다 불러옴
 */
function LoginScreen({ onLogin, onSignup, onSocialLogin, onDismiss, browsePrompt }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [hasRestoredLogin, setHasRestoredLogin] = useState(false);
  const [kakaoDiagBusy, setKakaoDiagBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pwEyeBlinkSeq, setPwEyeBlinkSeq] = useState(0);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [socialHint, setSocialHint] = useState("");

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

  const handleSubmitLogin = async () => {
    const id = String(loginId || "").trim();
    const pw = String(password || "").trim();
    if (!id || !pw) {
      setLoginError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setLoginError("");
    setLoginBusy(true);
    try {
      const result = await onLogin?.({ id, password: pw, rememberLogin });
      if (result && result.ok === false) {
        setLoginError(result.error || "로그인에 실패했습니다.");
      }
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "로그인할 수 없습니다.");
    } finally {
      setLoginBusy(false);
    }
  };

  const social = (provider) => {
    setSocialHint("");
    const ret = onSocialLogin?.(provider);
    if (ret != null && typeof ret.then === "function") {
      ret
        .then((ok) => {
          if (ok !== false) setSocialOpen(false);
        })
        .catch((e) => {
          setSocialHint(e instanceof Error ? e.message : "간편 로그인에 실패했습니다.");
        });
    } else {
      setSocialOpen(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#fafbfc] antialiased">
      <div className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 shadow-sm active:scale-95"
          >
            둘러보기 계속
          </button>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain py-8 sm:py-10">
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
            {loginError ? (
              <p className="mt-2 text-center text-[12px] font-medium leading-snug text-rose-600" role="alert">
                {loginError}
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
                onClick={() => onSocialLogin?.("find_account")}
                className="text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
              >
                아이디 / 비밀번호 찾기
              </button>
            </div>
          </div>

          <div className="mt-4 w-full max-w-[300px]">
            <button
              type="button"
              onClick={handleSubmitLogin}
              disabled={loginBusy}
              className="w-full rounded-lg bg-blue-600 py-2 text-[13px] font-semibold text-white transition active:scale-[0.99] active:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {loginBusy ? "로그인 중…" : "로그인"}
            </button>
            <button
              type="button"
              onClick={onSignup}
              className="mt-1.5 w-full rounded-lg border border-indigo-600 bg-indigo-600 py-2 text-[13px] font-semibold text-white shadow-sm transition active:scale-[0.99] hover:bg-indigo-700"
            >
              회원가입
            </button>
            <p className="mt-1.5 text-center text-[9px] leading-snug text-slate-500 [word-break:keep-all]">
              Portone 본인인증 · 약관 동의 · 아이디 설정
            </p>
          </div>

          <div className="mt-6 flex w-full max-w-[300px] flex-col items-center">
            <button
              type="button"
              onClick={() => {
                setSocialHint("");
                setSocialOpen(true);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
            >
              연동된 계정으로 간편 로그인
            </button>
            <p className="mt-2 w-full text-center text-[10px] leading-snug text-slate-500 [text-wrap:pretty] [word-break:keep-all] sm:text-[11px]">
              {SOCIAL_LOGIN_POLICY_HINT}
            </p>
          </div>
        </div>

        <p className="shrink-0 pb-4 pt-2 text-center text-[11px] font-medium text-slate-400">VLUE</p>
      </div>

      {socialOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="social-login-title">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={() => setSocialOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h2 id="social-login-title" className="text-center text-[15px] font-bold text-slate-900">
              연동 계정 로그인
            </h2>
            <p className="mt-1 text-center text-[11px] leading-relaxed text-slate-500 [word-break:keep-all]">
              VLUE 마스터 계정에 연결해 둔 소셜만 로그인할 수 있습니다. 미연동이면 먼저 회원가입 후 마이페이지에서 연동하세요.
            </p>
            {socialHint ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium leading-snug text-amber-900" role="alert">
                {socialHint}
              </p>
            ) : null}
            <div className="mt-4 w-full">
              <KakaoLoginButton onBeforeNavigate={() => setSocialOpen(false)} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                aria-label="Google로 로그인"
                onClick={() => social("google")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 transition active:scale-95"
              >
                <SocialGoogle />
              </button>
              <button
                type="button"
                aria-label="네이버로 로그인"
                onClick={() => social("naver")}
                className="flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-black/5 transition active:scale-95"
              >
                <SocialNaver />
              </button>
              <button
                type="button"
                aria-label="Apple로 로그인"
                onClick={() => social("apple")}
                className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200 transition active:scale-95"
              >
                <SocialApple />
              </button>
              <button type="button" aria-label="PASS 인증" onClick={() => social("pass")} className="transition active:scale-95">
                <SocialPass />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setSocialOpen(false);
                onSignup?.();
              }}
              className="mt-3 w-full rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-[12px] font-semibold text-indigo-900"
            >
              아직 계정이 없나요? 회원가입
            </button>
            <p className="mt-3 text-center text-[11px] leading-snug text-slate-500">
              카카오는 서버 OAuth로 로그인합니다. 연동은 가입 후 마이페이지에서 진행합니다.
            </p>
            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[10px] leading-snug text-slate-600 [word-break:keep-all]">
              <summary className="cursor-pointer font-semibold text-slate-700">카카오 Redirect URI (서버 OAuth)</summary>
              <p className="mt-2">
                Vite 프록시 사용 시 예시 (포트에 맞게 수정):
              </p>
              <p className="mt-1 break-all font-mono text-[9px] text-slate-800">
                {typeof window !== "undefined" ? `${window.location.origin}/api/v1/auth/kakao/callback` : "/api/v1/auth/kakao/callback"}
              </p>
              <p className="mt-2">SDK 팝업 방식(선택) Redirect:</p>
              <p className="mt-1 break-all font-mono text-[9px] text-slate-800">{getKakaoOAuthRedirectUri()}</p>
            </details>
            <button
              type="button"
              disabled={kakaoDiagBusy}
              onClick={async () => {
                setKakaoDiagBusy(true);
                try {
                  const text = await buildKakaoLoginDiagnosticsText();
                  console.info("[VLUE 카카오 점검]\n", text);
                  try {
                    await navigator.clipboard?.writeText?.(text);
                  } catch {
                    /* ignore */
                  }
                  window.alert(
                    "점검 결과를 클립보드에 복사했습니다. 메모장에 붙여넣어 확인하세요.\n(복사가 안 되면 F12 → Console에 [VLUE 카카오 점검] 로그가 있습니다.)"
                  );
                } catch (e) {
                  window.alert(e instanceof Error ? e.message : String(e));
                } finally {
                  setKakaoDiagBusy(false);
                }
              }}
              className="mt-3 w-full rounded-xl border border-dashed border-slate-300 bg-white py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {kakaoDiagBusy ? "점검 중…" : "카카오 연동 점검 (결과 복사)"}
            </button>
            <button type="button" onClick={() => setSocialOpen(false)} className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginScreen;
