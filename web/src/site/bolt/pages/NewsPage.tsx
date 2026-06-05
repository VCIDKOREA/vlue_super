import { Bell, Newspaper, AlertTriangle, Calendar, ArrowLeft, Tag } from 'lucide-react';
import { newsItems } from '../data/mockData';
import type { NewsItem } from '../types';

interface NewsPageProps {
  onBack: () => void;
}

const CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Bell }> = {
  alert: { label: '경보', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle },
  notice: { label: '공지', color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', icon: Bell },
  news: { label: '뉴스', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Newspaper },
};

function NewsCard({ item }: { item: NewsItem }) {
  const cfg = CFG[item.category];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <article className="card group cursor-pointer overflow-hidden flex flex-col hover:shadow-card-hover transition-all">
      {item.imageUrl && (
        <div className="h-48 overflow-hidden bg-gray-100 flex-shrink-0">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            {item.date}
          </div>
        </div>
        <h3 className="text-gray-900 font-bold text-sm leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2 flex-1" style={{ wordBreak: 'keep-all' }}>
          {item.title}
        </h3>
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{item.summary}</p>
      </div>
    </article>
  );
}

export default function NewsPage({ onBack }: NewsPageProps) {
  const newsOnly = newsItems.filter((n) => n.category !== 'event');

  return (
    <main className="min-h-screen bg-blue-tint pt-[60px]">
      <div className="bg-primary-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-semibold">VLUE 공식 채널</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">기업뉴스 &amp; 광고</h1>
          <p className="text-white/70 text-sm">최신 보안 뉴스, VLUE 공지, 보이스피싱 경보를 확인하세요.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {Object.entries(CFG).map(([key, c]) => {
            const Icon = c.icon;
            return (
              <span key={key} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.color} ${c.border}`}>
                <Icon className="w-3 h-3" />
                {c.label}
              </span>
            );
          })}
          <span className="text-xs text-gray-400 ml-1">총 {newsOnly.length}건</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {newsOnly.map((item) => <NewsCard key={item.id} item={item} />)}
        </div>

        <div className="mt-10 bg-primary-600 rounded-3xl p-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-full bg-white/20 text-white text-xs font-semibold">
            <Tag className="w-3 h-3" />
            VLUE 광고 배너
          </div>
          <h2 className="text-white font-black text-xl mb-2" style={{ letterSpacing: '-0.03em' }}>
            VLUE 인증으로 신뢰를 높이세요
          </h2>
          <p className="text-white/70 text-sm mb-4" style={{ wordBreak: 'keep-all' }}>
            VLUE 인증 기관은 고객에게 신뢰를 제공하고 보이스피싱 피해를 예방합니다.
          </p>
          <button className="px-6 py-2.5 bg-white text-primary-600 font-bold text-sm rounded-2xl hover:bg-primary-50 transition-colors">
            인증 신청하기
          </button>
        </div>
      </div>
    </main>
  );
}
