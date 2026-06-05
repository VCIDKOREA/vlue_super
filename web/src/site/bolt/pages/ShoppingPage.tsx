import { ShoppingBag, CreditCard, CheckCircle, Lock } from 'lucide-react';
import type { MarketingAuthUser } from '../components/AuthModal';
import MarketingMediaCommerceStore from '../components/MarketingMediaCommerceStore';

interface ShoppingPageProps {
  user?: MarketingAuthUser | null;
  onLoginClick?: () => void;
}

export default function ShoppingPage({ user, onLoginClick }: ShoppingPageProps) {
  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      <div className="bg-gradient-to-br from-primary-600 via-primary-600 to-indigo-700 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/90 text-sm font-semibold">앱과 동기화 · 미디어·페이지·공동구매</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!user && onLoginClick) onLoginClick();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-primary-600 font-bold text-xs rounded-xl hover:bg-primary-50 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              블루페이(Blue Pay)
            </button>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">VLUE 스토어</h1>
          <p className="text-white/80 text-sm max-w-2xl leading-relaxed" style={{ wordBreak: 'keep-all' }}>
            모바일 앱과 <strong>동일한 게시물·상품 피드</strong>를 웹에서 탐색합니다. 미디어쇼핑, 페이지쇼핑, 공동구매 탭 구성이 앱과 같습니다.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-3">
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-primary-800 font-bold text-sm mb-0.5">블루페이(Blue Pay) · 앱 연동</p>
            <p className="text-primary-600 text-xs leading-relaxed" style={{ wordBreak: 'keep-all' }}>
              웹에서 상품·라이브·페이지 상세를 확인하고, 결제·주문 알림·장바구니는 설치형 앱에서 이어집니다. 페이지쇼핑 상품은 서버 API와 자료실을 동기화합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-16">
        {!user && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-amber-800 text-sm font-medium flex-1" style={{ wordBreak: 'keep-all' }}>
              로그인 시 앱과 동일 계정으로 피드·결제가 연동됩니다.
            </p>
            <button
              type="button"
              onClick={() => onLoginClick?.()}
              className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              로그인
            </button>
          </div>
        )}

        <MarketingMediaCommerceStore user={user} onLoginClick={onLoginClick} />
      </div>
    </main>
  );
}
