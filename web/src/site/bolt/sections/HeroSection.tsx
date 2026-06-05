import { useState, FormEvent } from 'react';
import { Search, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onNavigate: (view: 'pricing' | 'shopping') => void;
}

const QUICK = ['명경채 요양병원', '다다오피스', '한국신뢰금융', '02-1234-5678'];

const STATS = [
  { brand: true, label: 'VLUE 인증 기관', value: '2,847', unit: '개' },
  { icon: CheckCircle, label: '검증 완료', value: '18.3만', unit: '건' },
  { icon: AlertTriangle, label: '사기 차단', value: '9,402', unit: '건' },
];

export default function HeroSection({ onSearch, onNavigate }: HeroSectionProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <section className="hero-section relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/70 via-blue-tint to-blue-tint pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center hero-inner">
        <div className="hero-badge inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-600 font-semibold">
          <VlueBrandMark size={14} className="hero-badge-icon" />
          <span style={{ wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>보이스피싱 예방 통합 인증 플랫폼</span>
        </div>

        <h1 className="hero-title font-black text-gray-900" style={{ letterSpacing: '-0.035em', wordBreak: 'keep-all' }}>
          의심되는 기관,<br />
          <span className="text-primary-500">지금 바로 확인</span>하세요
        </h1>

        <p className="hero-desc mx-auto text-gray-600" style={{ wordBreak: 'keep-all', lineHeight: '1.8' }}>
          전화·문자를 받기 전, 공공데이터와 VLUE 인증 데이터를 동시에 비교분석하여{' '}
          <span className="text-primary-500 font-bold">실시간으로 사기 여부를 즉시 판별합니다.</span>
        </p>

        {/* 검색창: 버튼이 절대 잘리지 않도록 flex-shrink-0 + 최소 너비 고정 */}
        <form onSubmit={handleSubmit} className="w-full hero-search-wrap mx-auto">
          <div className="flex items-center bg-white border border-gray-200 rounded-3xl shadow-card hover:shadow-card-hover focus-within:border-primary-400 focus-within:shadow-card-hover transition-all duration-200">
            <div className="relative flex-1 flex items-center min-w-0">
              <Search className="hero-search-icon absolute text-gray-400 pointer-events-none flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="기관명, 전화번호, 사업자번호..."
                className="w-full text-gray-900 focus:outline-none placeholder-gray-400 bg-transparent hero-search-input"
                style={{ letterSpacing: '-0.01em' }}
              />
            </div>
            <button
              type="submit"
              onClick={() => { if (query.trim()) onSearch(query.trim()); }}
              className="hero-search-btn bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold rounded-2xl transition-all duration-150 flex-shrink-0 shadow-soft flex items-center justify-center gap-1"
            >
              <Search className="hero-search-btn-icon" />
              <span className="hero-search-btn-text">검색</span>
            </button>
          </div>
        </form>

        <div className="hero-quick flex flex-wrap items-center justify-center">
          <span className="text-gray-400 hero-quick-label flex-shrink-0">빠른 검색:</span>
          {QUICK.map((term) => (
            <button
              key={term}
              onClick={() => { setQuery(term); onSearch(term); }}
              className="hero-quick-btn text-gray-500 bg-white hover:bg-primary-50 hover:text-primary-600 border border-gray-200 hover:border-primary-200 rounded-full transition-all duration-150 whitespace-nowrap"
            >
              {term}
            </button>
          ))}
        </div>

        {/* 통계: 좁은 화면에서 자연스럽게 wrap */}
        <div className="hero-stats mx-auto">
          {STATS.map((stat) => {
            const { label, value, unit, brand, icon: Icon } = stat;
            return (
            <div key={label} className="hero-stat-item flex flex-col items-center">
              {brand ? (
                <VlueBrandMark size={20} className="hero-stat-icon mb-0.5" />
              ) : (
                Icon && <Icon className="hero-stat-icon text-primary-600" />
              )}
              <span className="font-black text-gray-900 font-inter hero-stat-value leading-tight">
                {value}<span className="text-gray-500 font-semibold hero-stat-unit">{unit}</span>
              </span>
              <span className="text-gray-400 text-center hero-stat-label">{label}</span>
            </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center hero-cta-wrap">
          <button onClick={() => onNavigate('pricing')} className="btn-primary">
            VLUE 인증 신청하기
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate('shopping')} className="btn-secondary">
            VLUE 스토어 바로가기
          </button>
        </div>
      </div>
    </section>
  );
}
