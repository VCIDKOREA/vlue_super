import { MapPin, Calendar, ArrowRight, Users, ChevronRight } from 'lucide-react';
import { newsItems } from '../data/mockData';

const REGION_COLORS: Record<string, string> = {
  '서울': 'bg-primary-100 text-primary-700',
  '부산': 'bg-cyan-100 text-cyan-700',
  '대구': 'bg-orange-100 text-orange-700',
  '인천': 'bg-emerald-100 text-emerald-700',
  '광주': 'bg-violet-100 text-violet-700',
  '대전': 'bg-amber-100 text-amber-700',
};

function getRegionColor(region?: string) {
  if (!region) return 'bg-gray-100 text-gray-600';
  const city = region.split(' ')[0];
  return REGION_COLORS[city] ?? 'bg-gray-100 text-gray-600';
}

const FEATURED_ORGS = [
  {
    name: '명경채 요양병원',
    category: '의료기관',
    desc: 'VLUE 인증 의료기관. 노인 요양 및 재활 전문.',
    imageUrl: 'https://images.pexels.com/photos/305565/pexels-photo-305565.jpeg?auto=compress&cs=tinysrgb&w=300',
    region: '서울 강남구',
  },
  {
    name: '다다오피스',
    category: '공유오피스',
    desc: 'VLUE 인증 프리미엄 공유오피스. 보안 비즈니스 환경 제공.',
    imageUrl: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=300',
    region: '서울 마포구',
  },
  {
    name: '한국신뢰금융',
    category: '금융기관',
    desc: 'VLUE 인증 대출중개. 금융감독원 등록 합법 기관.',
    imageUrl: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=300',
    region: '서울 중구',
  },
];

export default function EventsSection() {
  const events = newsItems.filter((n) => n.category === 'event');

  return (
    <section className="bg-white py-20 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-primary-50 border border-primary-200 text-primary-600 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              지역 이벤트
            </div>
            <h2 className="section-title mb-1">지역 이벤트 &amp; 행사</h2>
            <p className="section-subtitle mb-6">전국 각 지역의 보이스피싱 예방 행사에 참여해 보세요.</p>

            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="card group cursor-pointer p-4 flex items-start gap-4 hover:border-primary-200"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex flex-col items-center justify-center flex-shrink-0 border border-primary-100">
                    <span className="text-primary-600 text-xs font-black leading-none">
                      {event.date.split('-')[2]}
                    </span>
                    <span className="text-primary-400 text-xs">
                      {event.date.split('-')[1]}월
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {event.region && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRegionColor(event.region)}`}>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {event.region}
                          </span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-gray-900 font-semibold text-sm group-hover:text-primary-600 transition-colors">{event.title}</h4>
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{event.summary}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary-500 font-medium flex-shrink-0">
                    신청
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline">
              전체 행사 보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" />
              인증 업체 홍보
            </div>
            <h2 className="section-title mb-1">VLUE 인증 기관</h2>
            <p className="section-subtitle mb-6">검증된 기관과 안전하게 거래하세요.</p>

            <div className="space-y-3">
              {FEATURED_ORGS.map((org) => (
                <div key={org.name} className="card group cursor-pointer flex items-center gap-3 p-3 hover:border-primary-200">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img src={org.imageUrl} alt={org.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-gray-900">{org.name}</span>
                      <span className="badge-green text-xs py-0 px-1.5">인증</span>
                    </div>
                    <span className="text-xs text-primary-500 font-medium">{org.category}</span>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{org.desc}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-gray-400" />
                      <span className="text-xs text-gray-400">{org.region}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
