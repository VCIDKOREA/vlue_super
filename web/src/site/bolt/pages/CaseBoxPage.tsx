import { useState } from 'react';
import { ArrowLeft, LayoutGrid, LogIn } from 'lucide-react';
import MyCaseScreen from '../../../components/mycase/MyCaseScreen.jsx';
import type { MarketingAuthUser } from '../components/AuthModal';

interface CaseBoxPageProps {
  user: MarketingAuthUser | null;
  onLoginClick: () => void;
  onBack: () => void;
}

/** 웹 케이스함 — 앱 마이케이스(쇼케이스 그리드)와 동일 */
export default function CaseBoxPage({ user, onLoginClick, onBack }: CaseBoxPageProps) {
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    const text = String(msg || '').trim();
    if (!text) return;
    setToast(text);
    window.setTimeout(() => setToast(''), 3200);
  };

  return (
    <div className="min-h-screen pt-16 bg-white">
      {toast ? (
        <div className="mkt-site-toast" role="status">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto max-w-[640px] px-3 sm:px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </button>

        <div className="mb-4">
          <h1
            className="mb-1 flex items-center gap-2 text-xl font-black text-gray-900"
            style={{ letterSpacing: '-0.03em' }}
          >
            <LayoutGrid className="h-5 w-5 text-primary-600" strokeWidth={2.2} />
            케이스함
          </h1>
          <p className="text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
            내 쇼케이스 게시물·송출 슬롯을 앱과 동일하게 확인합니다.
          </p>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="mb-4 text-sm text-slate-600" style={{ wordBreak: 'keep-all' }}>
              로그인 후 내 케이스함(쇼케이스 아카이브)을 웹에서 볼 수 있습니다.
            </p>
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-black text-white shadow-md hover:bg-primary-700"
            >
              <LogIn className="h-4 w-4" />
              로그인
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <MyCaseScreen onGoMain={onBack} onToast={showToast} />
          </div>
        )}
      </div>
    </div>
  );
}
