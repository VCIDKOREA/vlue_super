import { useState } from 'react';
import type { MarketingAuthUser } from '../components/AuthModal';
import AuctionListSection from '../../../components/auction/AuctionListSection.jsx';
import AuctionDetailSheet from '../../../components/auction/AuctionDetailSheet.jsx';
import AuctionInterestKeywords from '../../../components/auction/AuctionInterestKeywords.jsx';

interface AuctionPageProps {
  user?: MarketingAuthUser | null;
  onLoginClick?: () => void;
}

export default function AuctionPage({ user, onLoginClick }: AuctionPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-wider text-violet-600">VLUE Auction</p>
          <h1 className="text-2xl font-black text-slate-900">VLUE 경매</h1>
          <p className="text-sm text-slate-500 mt-1">진행 중인 개인 경매만 모아봅니다. 마감 1시간 이내 상품은 빨간 타이머로 표시됩니다.</p>
        </div>

        {toast ? (
          <div className="mb-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{toast}</div>
        ) : null}

        <AuctionInterestKeywords
          isLoggedIn={Boolean(user)}
          onToast={(msg) => {
            setToast(msg);
            window.setTimeout(() => setToast(''), 3500);
          }}
        />

        <AuctionListSection onSelect={(item) => setSelectedId(item.id)} />

        <AuctionDetailSheet
          auctionId={selectedId}
          open={Boolean(selectedId)}
          onClose={() => setSelectedId(null)}
          onToast={(msg) => {
            setToast(msg);
            window.setTimeout(() => setToast(''), 3500);
          }}
          isLoggedIn={Boolean(user)}
        />

        {!user ? (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onLoginClick}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white"
            >
              로그인 후 입찰하기
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
