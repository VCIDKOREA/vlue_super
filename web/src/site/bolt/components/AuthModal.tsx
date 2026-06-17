import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
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
            layout="marketing"
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
      <div className="absolute inset-0 bg-[#191f28]/40" onClick={onClose} />
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-[#e5e8eb] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-5 py-4">
          <div className="flex items-center gap-2">
            <VlueBrandLogo size={28} className="rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight text-[#191f28]">VLUE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8b95a1] hover:bg-[#f7f8fa] hover:text-[#191f28]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-[#f0f1f3]">
          {(['login', 'signup', 'signup_certified'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                reset();
                setMode(m);
              }}
              className={`flex-1 py-3 text-[12px] font-medium transition-colors ${
                mode === m ? 'text-[#191f28] border-b-2 border-[#191f28]' : 'text-[#8b95a1]'
              }`}
            >
              {m === 'login' ? '로그인' : m === 'signup' ? '가입' : '신뢰인증'}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mx-5 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-600">{error}</p>
        ) : null}

        {isSignup ? (
          <div className="space-y-4 px-5 py-5">
            {mode === 'signup_certified' ? (
              <p className="text-[12px] leading-relaxed text-[#4e5968]">
                신뢰인증 가입은 본인인증·증빙 절차를 포함합니다.
              </p>
            ) : (
              <p className="text-[12px] leading-relaxed text-[#4e5968]">
                비즈니스 메일 또는 VLUE ID 중 선택해 가입할 수 있습니다.
              </p>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={startSignup}
              className="w-full rounded-xl bg-[#191f28] py-3 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {loading ? '준비 중…' : '가입 시작'}
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleLoginSubmit} className="space-y-3 px-5 py-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-[#4e5968]">아이디 또는 이메일</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value.replace(/^@+/, '').toLowerCase())}
                  placeholder="VLUE ID 또는 가입 이메일"
                  className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#191f28]"
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-[#4e5968]">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={MEMBER_PASSWORD_HINT}
                    className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2.5 pr-10 text-[13px] outline-none focus:border-[#191f28]"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b95a1]"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#191f28] py-3 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {loading ? '로그인 중…' : '로그인'}
              </button>
            </form>

            <div className="space-y-2 px-5 pb-5">
              <p className="text-center text-[10px] text-[#8b95a1]">간편 로그인</p>
              <div className="flex flex-col gap-1.5">
                {SOCIAL.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSocialLogin(s.id)}
                    disabled={loading}
                    className="w-full rounded-xl py-2.5 text-[12px] font-medium disabled:opacity-50"
                    style={{
                      background: s.color,
                      color: s.textColor,
                      border: s.border ? '1px solid #e5e8eb' : 'none',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="pt-1 text-center text-[10px] leading-relaxed text-[#8b95a1]">{SOCIAL_LOGIN_POLICY_HINT}</p>
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
