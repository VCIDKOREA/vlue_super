import { useCallback, useRef } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import SensitiveRightClickGuard from '../components/SensitiveRightClickGuard';
import WebBizcardHub from '../components/WebBizcardHub';
import BackButton from '../../../components/common/BackButton';
import type { MarketingAuthUser } from '../components/AuthModal';

interface BusinessCardPageProps {
  user: MarketingAuthUser | null;
  onLoginClick: () => void;
  onBack: () => void;
  /** showcase = 웹 쇼케이스 관리 허브 (앱과 동일 편집기) */
  mode?: 'bizcard' | 'showcase';
}

export default function BusinessCardPage({
  user,
  onLoginClick,
  onBack,
  mode = 'bizcard',
}: BusinessCardPageProps) {
  const isShowcase = mode === 'showcase';
  const leaveGuardRef = useRef<(() => void) | null>(null);
  const handleBack = useCallback(() => {
    if (typeof leaveGuardRef.current === 'function') {
      leaveGuardRef.current();
      return;
    }
    onBack();
  }, [onBack]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <SensitiveRightClickGuard
        className={`relative mx-auto px-3 sm:px-4 ${
          isShowcase ? 'max-w-[1280px] pt-1' : 'max-w-3xl py-8'
        }`}
      >
        {isShowcase ? (
          <BackButton variant="panel" onBack={handleBack} className="left-1 top-0 z-20" />
        ) : (
          <>
            <button
              onClick={handleBack}
              className="mb-6 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-600"
            >
              <ArrowLeft className="h-4 w-4" />
              돌아가기
            </button>

            <div className="mb-6">
              <h1
                className="mb-0.5 flex items-center gap-2 text-2xl font-black text-gray-900"
                style={{ letterSpacing: '-0.03em', wordBreak: 'keep-all' }}
              >
                마이 쇼케이스
              </h1>
              <p className="text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
                {user
                  ? '내가 설정한 디지털 인증명함과 블루 쇼케이스를 확인하고 관리합니다.'
                  : '로그인 후 내 인증명함·쇼케이스를 확인할 수 있습니다.'}
              </p>
            </div>
          </>
        )}

        {!user ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600 mb-4" style={{ wordBreak: 'keep-all' }}>
              {isShowcase ? (
                <>
                  유선·대표번호 관리 계정 또는 일반 회원 아이디로 로그인한 뒤,
                  <strong className="text-slate-900"> 쇼케이스 관리</strong>에서 사진·음원·명함을 꾸밀 수 있습니다.
                </>
              ) : (
                <>
                  디지털인증명함과 레터링 설정은 <strong className="text-slate-900">본인 계정</strong>에 연결됩니다.
                  <br />
                  로그인하면 내 정보·명함 미리보기·수정·기업 회선 관리를 이용할 수 있습니다.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-black text-white shadow-md hover:bg-primary-700"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </button>
          </div>
        ) : (
          <WebBizcardHub
            user={user}
            autoOpenShowcase={isShowcase}
            onLeave={onBack}
            onBindLeaveGuard={(fn) => {
              leaveGuardRef.current = fn;
            }}
          />
        )}
      </SensitiveRightClickGuard>
    </div>
  );
}
