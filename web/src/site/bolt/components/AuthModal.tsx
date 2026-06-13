import { useState } from 'react';
import { X, Eye, EyeOff, Loader, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { VlueBrandLogo } from '../../../components/VlueBrandLogo.jsx';
import VlueOnboarding from '../../../components/VlueOnboarding.jsx';
import SignupErrorBoundary from '../../../components/SignupErrorBoundary.jsx';
import PostSignupPaymentModal from '../../../components/PostSignupPaymentModal.jsx';
import {
  beginWebSignup,
  restoreMarketingAuthUser,
  VLUE_MARKETING_SESSION_KEY,
  VLUE_APP_SESSION_KEY,
  vlueLoginWithCredentials,
  vlueSocialLogin,
} from '../../../lib/vlueAuthApi.js';
import { isBillableMembershipKind, normalizeMembershipKind } from '../../../lib/membershipBm.js';
import { writePendingPayment } from '../../../lib/postSignupPayment.js';

export type MarketingAuthUser = {
  userId: string;
  loginId: string;
  legalName?: string;
  email: string;
  grade?: 'basic' | 'certified';
};
import { SOCIAL_LOGIN_POLICY_HINT } from '../../../lib/socialLoginPolicy.js';
import { MEMBER_PASSWORD_HINT } from '../../../lib/memberPasswordRules.js';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: MarketingAuthUser) => void;
}

type Mode = 'login' | 'signup' | 'signup_certified';

const SOCIAL = [
  { id: 'kakao' as const, label: '카카오 로그인', color: '#FEE500', textColor: '#000', icon: '💬' },
  { id: 'naver' as const, label: '네이버 로그인', color: '#03C75A', textColor: '#fff', icon: 'N' },
  { id: 'google' as const, label: 'Google 로그인', color: '#fff', textColor: '#374151', icon: 'G', border: true },
];

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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

  const reset = () => {
    setError('');
    setLoginId('');
    setPassword('');
  };

  const startSignup = () => {
    beginWebSignup(mode);
    setOnboardingOpen(true);
  };

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
    const needsPayment = Boolean(payload?.postSignupPayment && isBillableMembershipKind(tier));

    if (needsPayment && payload?.postSignupPayment) {
      writePendingPayment(payload.postSignupPayment);
      setPostSignupPending(payload.postSignupPayment);
      setPostSignupPaymentOpen(true);
    }

    setOnboardingOpen(false);
    const user = restoreMarketingAuthUser();
    if (user) onSuccess(user);
    if (!needsPayment) onClose();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await vlueLoginWithCredentials({ loginId, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess(result.user);
    } catch {
      setError('서버에 연결할 수 없습니다. API가 실행 중인지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'kakao' | 'naver' | 'google') => {
    setError('');
    setLoading(true);
    try {
      const result = await vlueSocialLogin(provider);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess(result.user);
    } catch {
      setError('간편 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup' || mode === 'signup_certified';

  if (onboardingOpen) {
    return (
      <>
        <SignupErrorBoundary onCancel={() => setOnboardingOpen(false)}>
          <VlueOnboarding
            signupIntent={mode === 'signup_certified' ? 'trust' : 'general'}
            onComplete={handleOnboardingComplete}
            onCancel={() => setOnboardingOpen(false)}
          />
        </SignupErrorBoundary>
        <PostSignupPaymentModal
          open={postSignupPaymentOpen && Boolean(postSignupPending)}
          pending={postSignupPending}
          onComplete={finishPostSignupPayment}
          onSkip={finishPostSignupPayment}
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'authModalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <style>{`
          @keyframes authModalIn {
            from { opacity: 0; transform: scale(0.9) translateY(16px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="bg-gradient-to-br from-primary-600 to-blue-700 px-6 pt-6 pb-8 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5 mb-3 relative z-10">
            <VlueBrandLogo size={40} className="rounded-2xl ring-2 ring-white/25" />
            <span className="text-2xl font-black text-white" style={{ letterSpacing: '-0.04em' }}>
              VLUE
            </span>
          </div>
          <h2 className="text-white text-lg font-bold relative z-10" style={{ wordBreak: 'keep-all' }}>
            {mode === 'login' ? '로그인' : mode === 'signup_certified' ? '신뢰인증 가입' : '회원가입'}
          </h2>
          <p className="text-white/70 text-sm mt-1 relative z-10" style={{ wordBreak: 'keep-all' }}>
            {mode === 'login'
              ? '모바일·PC·www 어디서나 동일한 VLUE 계정으로 로그인합니다'
              : '모바일 앱과 동일한 본인인증·약관 절차로 브라우저에서 가입합니다'}
          </p>
        </div>

        <div className="flex border-b border-gray-100">
          {(['login', 'signup', 'signup_certified'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                reset();
                setMode(m);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                mode === m
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/40'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {m === 'login' ? '로그인' : m === 'signup' ? '일반가입' : '신뢰인증'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-5 mt-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600">
            {error}
          </div>
        )}

        {isSignup ? (
          <div className="px-5 py-6 space-y-4">
            {mode === 'signup_certified' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  신뢰인증 가입은 본인인증·AI 검증 절차를 거칩니다. 가입 중에도 일반 회원 권한으로 서비스를 이용할 수
                  있습니다.
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-800 mb-2">앱과 동일한 가입</p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                  약관 동의 · 아이디 설정 · 본인인증(PASS)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                  모바일·PC·www 어디서 가입해도 동일 계정으로 로그인
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                  쇼핑·메일·자료실 데이터 즉시 연동
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={startSignup}
              className="btn-primary w-full justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
              가입 시작
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[11px] text-gray-400">
              VLUE 앱은 앱스토어·플레이스토어에서 설치하세요. 가입 완료 후 이 페이지에서 <strong>동일 아이디</strong>로
              로그인할 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleLoginSubmit} className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">아이디</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value.replace(/^@+/, '').toLowerCase())}
                  placeholder="영문 소문자·숫자 (예: myvlue01)"
                  className="input-field"
                  autoComplete="username"
                  spellCheck={false}
                />
                <p className="text-[10px] text-gray-400 mt-1">가입 시 설정한 VLUE 아이디를 입력하세요.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={MEMBER_PASSWORD_HINT}
                    className="input-field pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                {loading ? '로그인 중…' : '로그인'}
              </button>
            </form>

            <div className="px-5 pb-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">간편 로그인</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="flex flex-col gap-2">
                {SOCIAL.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSocialLogin(s.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: s.color,
                      color: s.textColor,
                      border: s.border ? '1.5px solid #E5E7EB' : 'none',
                    }}
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-sm leading-none">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] text-gray-400 pt-1 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                {SOCIAL_LOGIN_POLICY_HINT}
              </p>
            </div>
          </>
        )}
      </div>
      <PostSignupPaymentModal
        open={postSignupPaymentOpen && Boolean(postSignupPending)}
        pending={postSignupPending}
        onComplete={finishPostSignupPayment}
        onSkip={finishPostSignupPayment}
      />
    </div>
  );
}
