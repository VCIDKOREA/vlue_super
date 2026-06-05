import { ShoppingBag, ArrowRight, MapPin, BadgeCheck } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import { storeAdvertisers } from '../data/mockData';
import type { StoreAdvertiser, View } from '../types';

type Props = {
  onNavigate: (view: View) => void;
};

function AdvertiserCard({ item, onVisit }: { item: StoreAdvertiser; onVisit: () => void }) {
  return (
    <article
      className="card group cursor-pointer overflow-hidden flex flex-col border-primary-100/80 hover:border-primary-200 hover:shadow-lg transition-all"
      onClick={onVisit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onVisit();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="h-40 overflow-hidden bg-gray-100 flex-shrink-0 relative">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-primary-600 rounded-full text-white text-[10px] font-bold shadow-sm">
          <VlueBrandMark size={10} />
          공식 광고
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full">
            <BadgeCheck className="w-3 h-3" />
            VLUE 인증
          </span>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {item.category}
          </span>
        </div>
        <h3 className="text-gray-900 font-bold text-sm leading-snug mb-1 group-hover:text-primary-600 transition-colors">
          {item.name}
        </h3>
        {item.region ? (
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-2">
            <MapPin className="w-3 h-3 shrink-0" />
            {item.region}
          </div>
        ) : null}
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 flex-1">{item.tagline}</p>
        <div className="flex items-center gap-1 mt-3 text-xs text-primary-600 font-bold">
          스토어 방문 <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </article>
  );
}

export default function StoreSection({ onNavigate }: Props) {
  const goStore = () => onNavigate('shopping');

  return (
    <section className="bg-gray-50 py-20 border-t border-gray-100" id="vlue-store">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-200 text-primary-700 text-xs font-bold">
              <ShoppingBag className="w-3.5 h-3.5" />
              VLUE 스토어
            </div>
            <h2 className="section-title">VLUE 스토어</h2>
            <p className="section-subtitle" style={{ wordBreak: 'keep-all' }}>
              앱과 동일한 미디어쇼핑·페이지쇼핑·공동구매 피드를 웹에서 탐색하세요. VLUE 인증 판매자만 노출됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={goStore}
            className="hidden sm:flex items-center gap-1.5 text-sm text-primary-600 font-bold hover:underline shrink-0"
          >
            스토어 전체보기 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {storeAdvertisers.map((item) => (
            <AdvertiserCard key={item.id} item={item} onVisit={goStore} />
          ))}
        </div>
        <div className="mt-6 flex sm:hidden justify-center">
          <button
            type="button"
            onClick={goStore}
            className="flex items-center gap-1.5 text-sm text-primary-600 font-bold hover:underline"
          >
            스토어 전체보기 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
