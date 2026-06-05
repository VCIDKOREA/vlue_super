import { useState, FormEvent } from 'react';
import { Search, CheckCircle, AlertCircle, ExternalLink, Building2, Phone, MapPin, Calendar, Hash, Clock, ArrowLeft } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import type { CertifiedOrg, PublicDataResult } from '../types';
import { certifiedOrgs, publicDataResults } from '../data/mockData';

interface SearchPageProps {
  initialQuery: string;
  onBack: () => void;
}

function matchPublic(q: string): PublicDataResult[] {
  const lower = q.toLowerCase();
  return publicDataResults.filter(
    (r) => r.name.toLowerCase().includes(lower) || r.address.toLowerCase().includes(lower) || r.phone.includes(lower)
  );
}

function matchCertified(q: string): CertifiedOrg[] {
  const lower = q.toLowerCase();
  return certifiedOrgs.filter(
    (r) => r.name.toLowerCase().includes(lower) || r.address.toLowerCase().includes(lower) || r.phone.includes(lower) || r.tags.some((t) => t.includes(lower))
  );
}

function PublicCard({ item }: { item: PublicDataResult }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h3 className="text-gray-900 font-bold text-sm" style={{ letterSpacing: '-0.015em' }}>{item.name}</h3>
            <span className="text-gray-400 text-xs">{item.category}</span>
          </div>
        </div>
        <span className="badge-green flex-shrink-0">{item.status}</span>
      </div>
      <div className="space-y-2 text-xs text-gray-500">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>{item.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className="font-inter">{item.phone}</span>
        </div>
        <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-gray-100">
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
          <span className="text-gray-400">출처: {item.source} · 업데이트: {item.lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}

function CertifiedCard({ item }: { item: CertifiedOrg }) {
  const isActive = item.status === 'active';
  const cardBg = isActive ? 'bg-gradient-to-br from-primary-50 to-blue-light border-primary-200 shadow-soft hover:shadow-card' : 'bg-gray-50 border-gray-200';
  const iconBg = isActive ? 'bg-primary-500 shadow-soft' : 'bg-gray-300';
  const statusCls = isActive
    ? 'text-primary-600 bg-white border border-primary-200 shadow-sm'
    : 'text-gray-500 bg-white border border-gray-200';
  const innerBg = isActive ? 'bg-white/70 border-primary-100' : 'bg-white border-gray-100';
  const tagCls = isActive ? 'text-primary-600 bg-primary-100' : 'text-gray-500 bg-gray-100';
  const tagBorder = isActive ? 'border-primary-100' : 'border-gray-100';

  return (
    <div className={`rounded-3xl border p-5 transition-all duration-200 ${cardBg}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <VlueBrandMark size={20} />
          </div>
          <div>
            <h3 className="text-gray-900 font-bold text-sm" style={{ letterSpacing: '-0.015em' }}>{item.name}</h3>
            <span className="text-gray-400 text-xs">{item.category}</span>
          </div>
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusCls}`}>
          {isActive ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {isActive ? 'VLUE 인증' : '만료'}
        </span>
      </div>

      <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">{item.description}</p>

      <div className={`rounded-2xl p-3 mb-3 border ${innerBg}`}>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mb-2">
          <Clock className="w-3.5 h-3.5" />
          실시간 인증 확인: {item.lastVerified}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span>{item.certifiedDate} ~ {item.validUntil}</span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-gray-600">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>{item.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className="font-inter">{item.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span>대표자: {item.representative} · 사업자: {item.businessNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className="font-inter text-gray-500">{item.certNumber}</span>
        </div>
      </div>

      {item.tags.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 mt-3 pt-3 border-t ${tagBorder}`}>
          {item.tags.map((tag) => (
            <span key={tag} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${tagCls}`}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage({ initialQuery, onBack }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);

  const pubResults = matchPublic(activeQuery);
  const certResults = matchCertified(activeQuery);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) setActiveQuery(query.trim());
  };

  return (
    <main className="min-h-screen bg-blue-tint pt-16">
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-20 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-gray-50 focus:bg-white transition-all"
                  style={{ letterSpacing: '-0.01em' }}
                />
                <button type="submit" className="absolute right-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors">
                  검색
                </button>
              </div>
            </form>
            <p className="text-sm text-gray-500 hidden sm:block" style={{ letterSpacing: '-0.01em' }}>
              <span className="font-bold text-gray-900">"{activeQuery}"</span> 검색 결과
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-gray-900 font-bold text-sm" style={{ letterSpacing: '-0.02em' }}>공공데이터포털 자료</h2>
                <p className="text-gray-400 text-xs">정부 공식 데이터 기반 정보</p>
              </div>
              <span className="badge-blue">{pubResults.length}건</span>
            </div>
            <div className="space-y-3">
              {pubResults.length > 0
                ? pubResults.map((item) => <PublicCard key={item.id} item={item} />)
                : (
                  <div className="bg-white rounded-3xl border border-gray-100 py-14 text-center shadow-card">
                    <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">공공데이터에서 결과를 찾을 수 없습니다.</p>
                  </div>
                )
              }
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="w-8 h-8 rounded-2xl bg-primary-100 flex items-center justify-center">
                <VlueBrandMark size={16} />
              </div>
              <div className="flex-1">
                <h2 className="text-gray-900 font-bold text-sm" style={{ letterSpacing: '-0.02em' }}>VLUE 인증 신뢰 데이터</h2>
                <p className="text-gray-400 text-xs">VLUE 직접 검증 · 실시간 인증</p>
              </div>
              <span className="badge-blue">{certResults.length}건</span>
            </div>
            <div className="space-y-3">
              {certResults.length > 0
                ? certResults.map((item) => <CertifiedCard key={item.id} item={item} />)
                : (
                  <div className="bg-white rounded-3xl border border-gray-100 py-14 text-center shadow-card">
                    <VlueBrandMark size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-gray-400 text-sm">VLUE 인증 데이터에서 결과를 찾을 수 없습니다.</p>
                  </div>
                )
              }
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
