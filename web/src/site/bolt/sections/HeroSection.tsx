import { useState, FormEvent } from 'react';
import { Search, ChevronRight, Shield } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import { v1WebShell } from '../../../lib/v1ReleaseScope.js';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onNavigate: (view: 'pricing' | 'shopping') => void;
}

export default function HeroSection({ onSearch, onNavigate }: HeroSectionProps) {
  const [query, setQuery] = useState('');
  const showStoreCta = Boolean(v1WebShell.vlueStore);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <section className="hero-section hero-section--it relative flex flex-col items-center justify-center overflow-hidden">
      <div className="hero-bg-grid pointer-events-none" aria-hidden />
      <div className="hero-bg-mesh pointer-events-none" aria-hidden />
      <div className="hero-glow hero-glow--left pointer-events-none" aria-hidden />
      <div className="hero-glow hero-glow--right pointer-events-none" aria-hidden />

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center hero-inner">
        <div className="hero-badge hero-badge--it hero-animate hero-animate--1 inline-flex items-center gap-2 rounded-full font-bold">
          <span className="hero-live-dot" aria-hidden />
          <span className="hero-live-label">LIVE</span>
          <span className="hero-badge-divider" aria-hidden />
          <VlueBrandMark size={14} className="hero-badge-icon" />
          <span style={{ wordBreak: 'keep-all', whiteSpace: 'nowrap' }}>보이스피싱 예방 통합 인증 플랫폼</span>
        </div>

        <h1 className="hero-title hero-animate hero-animate--2 text-slate-900" style={{ wordBreak: 'keep-all' }}>
          <span className="hidden sm:inline">의심되는 기관,</span>
          <span className="sm:hidden">의심 기관,</span>
          <br className="hidden sm:block" />
          <span className="hero-title-accent">지금 바로 확인</span>하세요
        </h1>

        <p className="hero-desc hero-animate hero-animate--3 mx-auto text-slate-600" style={{ wordBreak: 'keep-all' }}>
          <span className="hidden md:inline">
            전화·문자를 받기 전, 공공데이터와 VLUE 인증 데이터를 동시에 비교분석하여
            <br />
          </span>
          <span className="hero-desc-accent">기관·번호·사업자번호를 한 번에 검증합니다.</span>
        </p>

        <div className="hero-search-panel hero-animate hero-animate--4 mx-auto w-full">
          <div className="hero-search-panel-head">
            <Shield className="w-4 h-4 text-primary-500" aria-hidden />
            <span>한 번에 검증 · 기관 · 번호 · 사업자번호</span>
          </div>
          <form onSubmit={handleSubmit} className="w-full hero-search-wrap mx-auto">
            <div className="hero-search-shell flex items-center">
              <div className="relative flex-1 flex items-center min-w-0">
                <Search className="hero-search-icon absolute text-primary-400 pointer-events-none flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="기관명, 전화번호, 사업자번호..."
                  className="w-full text-gray-900 focus:outline-none placeholder-slate-400 bg-transparent hero-search-input"
                  style={{ letterSpacing: '-0.01em' }}
                />
              </div>
              <button
                type="submit"
                onClick={() => { if (query.trim()) onSearch(query.trim()); }}
                className="hero-search-btn text-white font-bold rounded-2xl transition-all duration-150 flex-shrink-0 flex items-center justify-center gap-1"
              >
                <Search className="hero-search-btn-icon" />
                <span className="hero-search-btn-text">검색</span>
              </button>
            </div>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-center hero-cta-wrap hero-animate hero-animate--5">
          <button onClick={() => onNavigate('pricing')} className="btn-primary hero-cta-primary">
            VLUE 인증 신청하기
            <ChevronRight className="w-4 h-4" />
          </button>
          {showStoreCta ? (
            <button onClick={() => onNavigate('shopping')} className="btn-secondary hero-cta-secondary">
              VLUE 스토어 바로가기
            </button>
          ) : (
            <button onClick={() => onNavigate('pricing')} className="btn-secondary hero-cta-secondary">
              V1 요금제 보기
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
