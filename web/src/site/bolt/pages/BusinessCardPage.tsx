import { ArrowLeft, LogIn } from 'lucide-react';
import SensitiveRightClickGuard from '../components/SensitiveRightClickGuard';
import WebBizcardHub from '../components/WebBizcardHub';
import type { MarketingAuthUser } from '../components/AuthModal';

interface BusinessCardPageProps {
  user: MarketingAuthUser | null;
  onLoginClick: () => void;
  onBack: () => void;
}

export default function BusinessCardPage({ user, onLoginClick, onBack }: BusinessCardPageProps) {
  return (
    <div className="min-h-screen pt-16 bg-gray-50">
      <SensitiveRightClickGuard className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.03em', wordBreak: 'keep-all' }}>
            VLUE 디지털 명함
          </h1>
          <p className="text-gray-500 text-sm" style={{ wordBreak: 'keep-all' }}>
            {user
              ? '내 계정의 디지털인증명함 · 레터링 · 기업 회선을 웹에서 설정합니다.'
              : '로그인 후 내 명함 정보를 확인·수정할 수 있습니다.'}
          </p>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600 mb-4" style={{ wordBreak: 'keep-all' }}>
              디지털인증명함과 레터링 설정은 <strong className="text-slate-900">본인 계정</strong>에 연결됩니다.
              <br />
              로그인하면 내 정보·명함 미리보기·수정·기업 회선 관리를 이용할 수 있습니다.
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
          <WebBizcardHub user={user} />
        )}
      </SensitiveRightClickGuard>
    </div>
  );
}
