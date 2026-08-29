import { useState } from 'react';
import { LogIn } from 'lucide-react';
import MyCaseScreen from '../../../components/mycase/MyCaseScreen.jsx';
import MyCaseShowcasePickTray from '../../../components/mycase/MyCaseShowcasePickTray.jsx';
import type { MarketingAuthUser } from '../components/AuthModal';

interface CaseBoxPageProps {
  user: MarketingAuthUser | null;
  onLoginClick: () => void;
  onBack?: () => void;
}

/** 웹 케이스함 — 인스타형 그리드 + 우측 쇼케이스 선택 트레이 */
export default function CaseBoxPage({ user, onLoginClick, onBack }: CaseBoxPageProps) {
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    const text = String(msg || '').trim();
    if (!text) return;
    setToast(text);
    window.setTimeout(() => setToast(''), 3200);
  };

  return (
    <div className="min-h-screen bg-white pt-16">
      {toast ? (
        <div className="mkt-site-toast" role="status">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[1180px] gap-6 px-4">
        <div className="min-w-0 flex-1 max-w-[935px]">
          {!user ? (
            <div className="px-4 py-12 text-center">
              <p className="mb-4 text-sm text-slate-600" style={{ wordBreak: 'keep-all' }}>
                로그인 후 내 케이스함(쇼케이스 아카이브)을 웹에서 볼 수 있습니다.
              </p>
              <button
                type="button"
                onClick={onLoginClick}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0095f6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1877f2]"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </button>
            </div>
          ) : (
            <MyCaseScreen
              onGoMain={onBack}
              onToast={showToast}
              layout="desktop"
              showSearch
              showLineSwitcher
              showcasePickEnabled
            />
          )}
        </div>

        {user ? (
          <div className="hidden w-[200px] shrink-0 lg:block">
            <MyCaseShowcasePickTray enabled variant="sidebar" onToast={showToast} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
