import { useState } from "react";
import { Search, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { VlueBrandMark } from "../../components/VlueBrandLogo.jsx";

const QUICK = ["명경채 요양병원", "다다오피스", "한국신뢰금융", "02-1234-5678"];

const STATS = [
  { brand: true, label: "VLUE 인증 기관", value: "2,847", unit: "개" },
  { icon: CheckCircle, label: "검증 완료", value: "18.3만", unit: "건" },
  { icon: AlertTriangle, label: "사기 차단", value: "9,402", unit: "건" },
];

export default function HeroSection({ onSearch, onNavigate }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <section className="hero-section relative flex flex-col items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-50/70 via-blue-tint to-blue-tint" />

      <div className="hero-inner relative z-10 mx-auto w-full max-w-3xl text-center">
        <div className="hero-badge inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 font-semibold text-primary-600">
          <VlueBrandMark size={14} className="hero-badge-icon shrink-0" />
          <span style={{ wordBreak: "keep-all", whiteSpace: "nowrap" }}>
            보이스피싱 예방 통합 인증 플랫폼
          </span>
        </div>

        <h1
          className="hero-title font-black text-gray-900"
          style={{ letterSpacing: "-0.035em", wordBreak: "keep-all" }}
        >
          의심되는 기관,
          <br />
          <span className="text-primary-500">지금 바로 확인</span>
          하세요
        </h1>

        <p
          className="hero-desc mx-auto text-gray-600"
          style={{ wordBreak: "keep-all", lineHeight: "1.8" }}
        >
          전화·문자를 받기 전, 공공데이터와 VLUE 인증 데이터를 동시에 비교분석하여{" "}
          <span className="font-bold text-primary-500">
            실시간으로 사기 여부를 즉시 판별합니다.
          </span>
        </p>

        <form onSubmit={handleSubmit} className="hero-search-wrap mx-auto w-full">
          <div className="flex items-center rounded-3xl border border-gray-200 bg-white shadow-card transition-all duration-200 hover:shadow-card-hover focus-within:border-primary-400 focus-within:shadow-card-hover">
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search className="hero-search-icon pointer-events-none absolute shrink-0 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="기관명, 전화번호, 사업자번호..."
                className="hero-search-input w-full bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
                style={{ letterSpacing: "-0.01em" }}
              />
            </div>
            <button
              type="submit"
              onClick={() => {
                if (query.trim()) onSearch(query.trim());
              }}
              className="hero-search-btn flex shrink-0 items-center justify-center gap-1 rounded-2xl bg-primary-500 font-semibold text-white shadow-soft transition-all duration-150 hover:bg-primary-600 active:bg-primary-700"
            >
              <Search className="hero-search-btn-icon" />
              <span className="hero-search-btn-text">검색</span>
            </button>
          </div>
        </form>

        <div className="hero-quick flex flex-wrap items-center justify-center">
          <span className="hero-quick-label shrink-0 text-gray-400">빠른 검색:</span>
          {QUICK.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
                onSearch(term);
              }}
              className="hero-quick-btn whitespace-nowrap rounded-full border border-gray-200 bg-white text-gray-500 transition-all duration-150 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600"
            >
              {term}
            </button>
          ))}
        </div>

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
              <span className="hero-stat-value font-inter font-black leading-tight text-gray-900">
                {value}
                <span className="hero-stat-unit font-semibold text-gray-500">{unit}</span>
              </span>
              <span className="hero-stat-label text-center text-gray-400">{label}</span>
            </div>
            );
          })}
        </div>

        <div className="hero-cta-wrap flex flex-wrap items-center justify-center">
          <button type="button" onClick={() => onNavigate("pricing")} className="btn-primary">
            VLUE 인증 신청하기
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onNavigate("shopping")} className="btn-secondary">
            블루쇼핑 바로가기
          </button>
        </div>
      </div>
    </section>
  );
}
