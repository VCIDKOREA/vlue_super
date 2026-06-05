import { Calendar, MapPin, ArrowLeft, Users, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { newsItems } from '../data/mockData';
import type { NewsItem } from '../types';

interface EventsPageProps {
  onBack: () => void;
}

const REGION_COLORS: Record<string, string> = {
  '서울': 'bg-primary-100 text-primary-700',
  '부산': 'bg-cyan-100 text-cyan-700',
  '대구': 'bg-orange-100 text-orange-700',
  '인천': 'bg-emerald-100 text-emerald-700',
  '광주': 'bg-teal-100 text-teal-700',
  '대전': 'bg-amber-100 text-amber-700',
};

function getRegionColor(region?: string) {
  if (!region) return 'bg-gray-100 text-gray-600';
  const city = region.split(' ')[0];
  return REGION_COLORS[city] ?? 'bg-gray-100 text-gray-600';
}

function EventCard({ event }: { event: NewsItem }) {
  const parts = event.date.split('-');
  return (
    <div className="card group cursor-pointer p-5 flex items-start gap-4 hover:border-primary-200 hover:shadow-card-hover transition-all">
      <div className="w-14 h-14 rounded-2xl bg-primary-50 flex flex-col items-center justify-center flex-shrink-0 border border-primary-100">
        <span className="text-primary-600 text-lg font-black leading-none">{parts[2]}</span>
        <span className="text-primary-400 text-xs">{parts[1]}월</span>
      </div>
      {event.imageUrl && (
        <div className="w-16 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 hidden sm:block">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {event.region && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${getRegionColor(event.region)}`}>
              <MapPin className="w-2.5 h-2.5" />
              {event.region}
            </span>
          )}
        </div>
        <h4 className="text-gray-900 font-bold text-sm group-hover:text-primary-600 transition-colors mb-1" style={{ wordBreak: 'keep-all' }}>{event.title}</h4>
        <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{event.summary}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-primary-500 font-semibold flex-shrink-0">
        신청
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

export default function EventsPage({ onBack }: EventsPageProps) {
  const [query, setQuery] = useState('');
  const events = newsItems.filter((n) => n.category === 'event').filter((e) =>
    query === '' ||
    (e.title.toLowerCase().includes(query.toLowerCase())) ||
    (e.region?.toLowerCase().includes(query.toLowerCase()))
  );

  const regions = ['전체', ...Array.from(new Set(newsItems.filter((n) => n.category === 'event').map((e) => e.region?.split(' ')[0]).filter(Boolean) as string[]))];
  const [selectedRegion, setSelectedRegion] = useState('전체');

  const filtered = selectedRegion === '전체'
    ? events
    : events.filter((e) => e.region?.startsWith(selectedRegion));

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
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-semibold">전국 보안 캠페인</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">지역 이벤트</h1>
          <p className="text-white/70 text-sm mb-5">전국 각 지역의 보이스피싱 예방 행사 및 VLUE 인증 설명회를 확인하세요.</p>
          <div className="relative max-w-xl">
            <div className="flex items-center bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl overflow-hidden focus-within:bg-white/25 transition-all">
              <Search className="absolute left-4 w-4 h-4 text-white/70 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="행사명, 지역으로 검색..."
                className="flex-1 pl-11 pr-4 py-3 bg-transparent text-white text-sm placeholder-white/60 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all border ${
                selectedRegion === r
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-primary-600 hover:bg-primary-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-900">{filtered.length}개</span>의 행사
          </p>
          <div className="flex items-center gap-1.5 text-xs text-primary-600">
            <Users className="w-3.5 h-3.5" />
            참가 신청 가능
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Calendar className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 font-semibold text-sm">해당 지역 행사가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </main>
  );
}
