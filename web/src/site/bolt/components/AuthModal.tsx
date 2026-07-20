import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import VLUE_BRAND_LOGO from '../../../assets/vlue-shield-logo.svg?url';
import VlueOnboarding from '../../../components/VlueOnboarding.jsx';
import SignupErrorBoundary from '../../../components/SignupErrorBoundary.jsx';
import PostSignupPaymentModal from '../../../components/PostSignupPaymentModal.jsx';
import KakaoLoginButton from '../../../components/auth/KakaoLoginButton.jsx';
import GoogleLoginButton from '../../../components/auth/GoogleLoginButton.jsx';
import NaverLoginButton from '../../../components/auth/NaverLoginButton.jsx';
import InstagramLoginButton from '../../../components/auth/InstagramLoginButton.jsx';
import { VlueEyeMark } from '../../../components/VlueEyeMark.jsx';
import {
  beginWebSignup,
  restoreMarketingAuthUser,
  VLUE_MARKETING_SESSION_KEY,
  VLUE_APP_SESSION_KEY,
  vlueLoginWithCredentials,
} from '../../../lib/vlueAuthApi.js';
import { isBillableMembershipKind, normalizeMembershipKind } from '../../../lib/membershipBm.js';
import { writePendingPayment } from '../../../lib/postSignupPayment.js';
import { v1WebShell } from '../../../lib/v1ReleaseScope.js';
export type MarketingAuthUser = {
  userId: string;
  loginId: string;
  legalName?: string;
  email: string;
  grade?: 'basic' | 'certified';
};

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: MarketingAuthUser) => void;
  initialMode?: Mode;
  autoStartSignup?: boolean;
}

type Mode = 'login' | 'signup' | 'signup_certified';

const SAVED_ID_KEY = 'vlue_saved_login_id';
const SAVED_PASSWORD_KEY = 'vlue_saved_login_password';
const REMEMBER_KEY = 'vlue_remember_login';

export default function AuthModal({
  onClose,
  onSuccess,
  initialMode = 'login',
  autoStartSignup = false,
}: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(false);
  const [generalAuthOpen, setGeneralAuthOpen] = useState(false);
  const [hasRestoredLogin, setHasRestoredLogin] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pwEyeBlinkSeq, setPwEyeBlinkSeq] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [postSignupPaymentOpen, setPostSignupPaymentOpen] = useState(false);
  const [postSignupPending, setPostSignupPending] = useState<{
    membershipKind: string;
    billingCycle: string;
    amountKrw: number;
    label?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBER_KEY) === '1';
      const saved = localStorage.getItem(SAVED_ID_KEY) || '';
      const savedPw = localStorage.getItem(SAVED_PASSWORD_KEY) || '';
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

  const startSignup = (nextMode: Mode = 'signup') => {
    setMode(nextMode);
    beginWebSignup(nextMode);
    setOnboardingOpen(true);
  };

  useEffect(() => {
    if (!autoStartSignup) return;
    if (initialMode !== 'signup' && initialMode !== 'signup_certified') return;
    beginWebSignup(initialMode);
    setMode(initialMode);
    setOnboardingOpen(true);
  }, [autoStartSignup, initialMode]);

  const finishPostSignupPayment = () => {
    setPostSignupPaymentOpen(false);
    setPostSignupPending(null);
    onClose();
  };

  const handleOnboardingComplete = (payload?: {
    membershipKind?: string;
    membershipTier?: string;
    postSignupPayment?: {
      membershipKind: string;
      billingCycle: string;
      amountKrw: number;
      label?: string;
    } | null;
  }) => {
    try {
      localStorage.setItem(VLUE_MARKETING_SESSION_KEY, '1');
      localStorage.setItem(VLUE_APP_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }

    const tier = normalizeMembershipKind(payload?.membershipKind || payload?.membershipTier);
    const billable = Boolean(payload?.postSignupPayment && isBillableMembershipKind(tier));
    const webPayEnabled = Boolean(v1WebShell.webSubscribePayment);
    const needsPayment = billable && webPayEnabled;

    if (needsPayment && payload?.postSignupPayment) {
      writePendingPayment(payload.postSignupPayment);
      setPostSignupPending(payload.postSignupPayment);
      setPostSignupPaymentOpen(true);
    }

    setOnboardingOpen(false);
    const user = restoreMarketingAuthUser();
    if (user) onSuccess(user);
    if (!needsPayment) {
      if (billable && !webPayEnabled) {
        try {
          window.alert(
            '가입이 완료되었습니다.\n유료 멤버십 결제는 VLUE 앱을 다운로드하여 진행해 주세요.'
          );
        } catch {
          /* ignore */
        }
        try {
          window.location.hash = 'download';
        } catch {
          /* ignore */
        }
      }
      onClose();
    }
  };

  const togglePasswordVisible = () => {
    setPwEyeBlinkSeq((n) => n + 1);
    setPasswordVisible((v) => !v);
  };

  const persistRememberedCredentials = () => {
    try {
      if (rememberLogin) {
        localStorage.setItem(REMEMBER_KEY, '1');
        localStorage.setItem(SAVED_ID_KEY, String(loginId || '').trim());
        localStorage.setItem(SAVED_PASSWORD_KEY, String(password || ''));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(SAVED_ID_KEY);
        localStorage.removeItem(SAVED_PASSWORD_KEY);
      }
    } catch {
      /* ignore */
    }
  };

  const handleLoginSubmit = async () => {
    const id = String(loginId || '').trim();
    const pw = String(password || '').trim();
    if (!id || !pw) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await vlueLoginWithCredentials({ loginId: id, password: pw });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      persistRememberedCredentials();
      if (result.redirect) return;
      onSuccess(result.user);
    } catch {
      setError('서버에 연결할 수 없습니다. API가 실행 중인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (onboardingOpen) {
    return (
      <>
        <SignupErrorBoundary onCancel={() => setOnboardingOpen(false)}>
          <VlueOnboarding
            layout="marketing"
            signupIntent={mode === 'signup_certified' ? 'trust' : 'general'}
            onComplete={handleOnboardingComplete}
            onCancel={() => setOnboardingOpen(false)}
          />
        </SignupErrorBoundary>
        {v1WebShell.webSubscribePayment ? (
          <PostSignupPaymentModal
            open={postSignupPaymentOpen && Boolean(postSignupPending)}
            pending={postSignupPending}
            onComplete={finishPostSignupPayment}
            onSkip={finishPostSignupPayment}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#191f28]/40" onClick={onClose} />
      <div className="relative max-h-[min(92dvh,760px)] w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-[#fafbfc] shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-400 shadow-sm transition hover:text-slate-600 active:scale-95"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex max-h-[min(92dvh,760px)] flex-col items-center overflow-y-auto overscroll-y-contain px-5 pb-6 pt-8 sm:pt-9">
          <img
            src={VLUE_BRAND_LOGO}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-blue-900/10"
            draggable={false}
          />
          <h2 className="mt-4 text-[24px] font-bold tracking-tight text-slate-900">VLUE</h2>
          <p className="mt-2 w-full max-w-[300px] text-center text-[13px] font-normal leading-snug text-slate-600 [text-wrap:pretty] [word-break:keep-all] sm:max-w-[320px] sm:text-[14px] sm:leading-relaxed">
            검증된 연결로 대화하고, 비즈니스를 이어갑니다.
          </p>

          {error ? (
            <p className="mt-4 w-full max-w-[300px] rounded-lg bg-rose-50 px-3 py-2 text-center text-[12px] text-rose-600" role="alert">
              {error}
            </p>
          ) : null}

          {!generalAuthOpen ? (
            <div className="mt-7 flex w-full max-w-[300px] flex-col items-center">
              <p className="w-full text-center text-[12px] leading-relaxed text-slate-600 [word-break:keep-all]">
                카카오 · Google · 네이버 · Instagram · VLUE 가입과 로그인이 가능합니다.
              </p>
              <div className="mt-4 flex w-full flex-col gap-2.5">
                <KakaoLoginButton disabled={loading} />
                <GoogleLoginButton disabled={loading} />
                <NaverLoginButton disabled={loading} />
                <InstagramLoginButton disabled={loading} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setGeneralAuthOpen(true);
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#2563EB] to-[#4F46E5] py-3 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99]"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm" aria-hidden>
                  <img src={VLUE_BRAND_LOGO} alt="" className="h-5 w-5 rounded" />
                </span>
                <span>VLUE 로그인 · 회원가입</span>
              </button>
              <p className="mt-3 w-full text-center text-[11px] leading-snug text-slate-500 [word-break:keep-all]">
                VLUE 내부 기능 중 본인인증이 필요할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="mt-6 w-full max-w-[300px]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <input
                  type="text"
                  name="loginId"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="가입 시 설정한 아이디"
                  className="w-full border-0 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none ring-0"
                  spellCheck={false}
                />
                <div className="h-px bg-slate-100" />
                <div className="relative flex items-center">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleLoginSubmit();
                    }}
                    placeholder="비밀번호"
                    className="w-full border-0 bg-white py-2.5 pl-3 pr-11 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none ring-0"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisible}
                    className="absolute right-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 active:scale-95"
                    aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 표시'}
                    title={passwordVisible ? '비밀번호 숨기기' : '비밀번호 표시'}
                  >
                    <VlueEyeMark
                      key={pwEyeBlinkSeq}
                      variant="header"
                      tone="muted"
                      svgWidth={22}
                      svgHeight={20}
                      wrapClassName={`vlue-header-eye-wrap vlue-login-pw-eye ${pwEyeBlinkSeq > 0 ? 'vlue-header-eye-wrap--nav-loading' : ''}`}
                    />
                  </button>
                </div>
              </div>

              <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-blue-600"
                />
                <span className="min-w-0 leading-snug">아이디·비밀번호 저장</span>
              </label>
              {hasRestoredLogin ? (
                <button
                  type="button"
                  onClick={() => {
                    setLoginId('');
                    setPassword('');
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
              ) : null}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleLoginSubmit()}
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 py-2 text-[13px] font-semibold text-white transition active:scale-[0.99] active:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
                >
                  {loading ? '로그인 중…' : '로그인'}
                </button>
                <button
                  type="button"
                  onClick={() => startSignup('signup')}
                  disabled={loading}
                  className="mt-1.5 w-full rounded-lg border border-indigo-600 bg-indigo-600 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50"
                >
                  회원가입
                </button>
                <button
                  type="button"
                  onClick={() => startSignup('signup_certified')}
                  disabled={loading}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50"
                >
                  신뢰인증 가입
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setGeneralAuthOpen(false);
                  }}
                  className="mt-3 w-full py-1 text-[12px] font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  간편 로그인으로 돌아가기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {v1WebShell.webSubscribePayment ? (
        <PostSignupPaymentModal
          open={postSignupPaymentOpen && Boolean(postSignupPending)}
          pending={postSignupPending}
          onComplete={finishPostSignupPayment}
          onSkip={finishPostSignupPayment}
        />
      ) : null}
    </div>
  );
}
