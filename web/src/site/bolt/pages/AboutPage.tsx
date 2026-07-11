import { Fragment, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle, TrendingUp, Globe, Monitor, Smartphone,
  ArrowRight, Phone, Server, Zap, Eye, Users, Award,
  Lock, Shield, PhoneOff, ShieldX, Search, FileSpreadsheet,
  Radio, Bell, Cpu, Heart, MessageCircle, ShoppingBag,
  Target, Sparkles, Download,
} from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import AboutSearchHub from '../components/AboutSearchHub';
import ServiceAccordion from '../components/ServiceAccordion';
import MembershipBenefitsTable from '../components/MembershipBenefitsTable';
import {
  ABOUT_HERO,
  COMPANY_PROFILE,
  PLATFORM_SPLIT,
  PROBLEM_STATS,
  PHISHING_WARNINGS,
  PHISHING_TIPS,
  VOICE_PHISHING_APP_LINES,
  SOLUTION_STEPS,
  ARCHITECTURE_FLOW,
  WEB_EXCLUSIVE_FEATURES,
  SHARED_SERVICES,
  INSTALL_EXCLUSIVE_FEATURES,
  INSTALL_HIGHLIGHTS,
  PRICING_TIER_FEATURES,
  TRUST_ITEMS,
  CHART_FOOTNOTE,
  VISION_CARDS,
  MARKET_BARS,
  ABOUT_CATEGORIES,
  type AboutCategoryId,
  type CatalogFeature,
} from '../data/serviceIntroContent';
import {
  MEMBERSHIP_PLAN_DETAILS,
  MARKETING_PRICING_TIERS,
} from '../data/membershipPlansContent';
import { SYNC_PRINCIPLES } from '../data/platformArchitectureContent';
import { isWebAiExcelEnabled, isWebPcDownloadEnabled } from '../../../lib/v1ReleaseScope.js';

const CHART_DATA = [
  { year: '2019', value: 3209, label: '3,209억' },
  { year: '2020', value: 4023, label: '4,023억' },
  { year: '2021', value: 4876, label: '4,876억' },
  { year: '2022', value: 5694, label: '5,694억' },
  { year: '2023', value: 7500, label: '7,500억+' },
];

const MAX_VALUE = 8000;
const CHART_H = 220;
const CHART_W = 560;
const PAD_L = 58;
const PAD_R = 24;
const PAD_T = 36;
const PAD_B = 48;
const INNER_W = CHART_W - PAD_L - PAD_R;
const INNER_H = CHART_H - PAD_T - PAD_B;
const Y_TICKS = [0, 2000, 4000, 6000, 8000];

const SOLUTION_ICONS = [Phone, Server, Eye, CheckCircle] as const;
const WARNING_ICONS = [PhoneOff, Eye, ShieldX] as const;
const WARNING_COLORS = [
  { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  { color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
] as const;

const PILLAR_ICONS = [Shield, Zap, Sparkles] as const;
const WEB_ICONS = [Search, FileSpreadsheet] as const;
const INSTALL_ICON_MAP: Record<string, typeof Radio> = {
  lettering: Shield,
  family: Heart,
  remote: Radio,
  chat: MessageCircle,
  commerce: ShoppingBag,
  partner: Target,
};

function yPos(v: number) {
  return PAD_T + INNER_H - (v / MAX_VALUE) * INNER_H;
}
function xPos(i: number) {
  return PAD_L + (INNER_W / (CHART_DATA.length - 1)) * i;
}

function PhishingChartFull() {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const linePath = CHART_DATA.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${animated ? yPos(d.value) : PAD_T + INNER_H}`,
  ).join(' ');
  const areaPath = `${linePath} L ${xPos(CHART_DATA.length - 1)} ${PAD_T + INNER_H} L ${xPos(0)} ${PAD_T + INNER_H} Z`;

  return (
    <div ref={ref} className="card p-5 sm:p-6 h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-gray-900 font-bold text-sm sm:text-base">연도별 보이스피싱 피해액 추이</h3>
          <p className="text-gray-400 text-xs mt-0.5">단위: 억원 · 출처: 경찰청 사이버수사국</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 border border-red-100 px-2 py-1 rounded-full shrink-0">
          <TrendingUp className="w-3.5 h-3.5" />
          매년 급증
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ minWidth: 300, maxHeight: 240 }}>
          <defs>
            <linearGradient id="aboutAreaGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3182F6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3182F6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="aboutLineGrad2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line x1={PAD_L} y1={yPos(tick)} x2={CHART_W - PAD_R} y2={yPos(tick)} stroke="#F1F5F9" strokeWidth="1.5" />
              <text x={PAD_L - 8} y={yPos(tick) + 4} textAnchor="end" fontSize="10" fill="#94A3B8">
                {tick === 0 ? '0' : `${tick / 1000}천`}
              </text>
            </g>
          ))}
          <path d={areaPath} fill="url(#aboutAreaGrad2)" />
          <path d={linePath} fill="none" stroke="url(#aboutLineGrad2)" strokeWidth="3" strokeLinecap="round" />
          {CHART_DATA.map((d, i) => {
            const cx = xPos(i);
            const cy = animated ? yPos(d.value) : PAD_T + INNER_H;
            const last = i === CHART_DATA.length - 1;
            return (
              <g key={d.year}>
                <circle cx={cx} cy={cy} r={last ? 7 : 5} fill="#fff" stroke={last ? '#EF4444' : '#3182F6'} strokeWidth={2} />
                <text x={cx} y={cy - (last ? 16 : 12)} textAnchor="middle" fontSize={last ? 11 : 10} fontWeight={last ? 800 : 600} fill={last ? '#EF4444' : '#3182F6'}>
                  {d.label}
                </text>
                <text x={cx} y={PAD_T + INNER_H + 16} textAnchor="middle" fontSize="11" fill="#64748B" fontWeight="600">
                  {d.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-4 text-xs text-red-700 font-medium leading-relaxed bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
        {CHART_FOOTNOTE}
      </p>
    </div>
  );
}

function SectionHead({
  badge,
  title,
  desc,
  tone = 'default',
}: {
  badge: React.ReactNode;
  title: string;
  desc: string;
  tone?: 'default' | 'danger' | 'primary';
}) {
  const toneClass =
    tone === 'danger'
      ? 'from-red-50 to-white border-red-100'
      : tone === 'primary'
        ? 'from-primary-50 to-white border-primary-100'
        : 'from-slate-50 to-white border-slate-200';
  return (
    <div className={`rounded-2xl border bg-gradient-to-r ${toneClass} px-5 py-4 mb-6`}>
      <div className="mb-2">{badge}</div>
      <h2 className="text-xl sm:text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.03em' }}>
        {title}
      </h2>
      <p className="mt-2 mkt-section-lead" style={{ wordBreak: 'keep-all' }}>
        {desc}
      </p>
    </div>
  );
}

function BentoCard({
  icon: Icon,
  title,
  desc,
  accent = 'primary',
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent?: 'primary' | 'indigo' | 'amber' | 'slate';
  onClick?: () => void;
}) {
  const accents = {
    primary: 'from-primary-500/10 to-white border-primary-100 group-hover:border-primary-300',
    indigo: 'from-indigo-500/10 to-white border-indigo-100 group-hover:border-indigo-300',
    amber: 'from-amber-500/10 to-white border-amber-100 group-hover:border-amber-300',
    slate: 'from-slate-500/10 to-white border-slate-200 group-hover:border-slate-300',
  };
  const iconColors = {
    primary: 'bg-primary-600 text-white',
    indigo: 'bg-indigo-600 text-white',
    amber: 'bg-amber-500 text-white',
    slate: 'bg-slate-800 text-white',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 text-left transition-all hover:shadow-lg ${accents[accent]} ${onClick ? 'cursor-pointer w-full' : ''}`}
    >
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${iconColors[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mkt-card-title">{title}</p>
      <p className="mt-2 mkt-desc line-clamp-4">{desc}</p>
      {onClick ? (
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
          바로가기 <ArrowRight className="w-3 h-3" />
        </span>
      ) : null}
    </Tag>
  );
}

interface AboutPageProps {
  onSearch: (query: string) => void;
  onNavigate: (view: string) => void;
}

const SCROLL_SPY_SECTIONS = ABOUT_CATEGORIES.filter((c) => c.id !== 'all');

function getAboutScrollSpyAnchor() {
  const nav = document.querySelector('.mkt-about-section-nav');
  if (nav) return nav.getBoundingClientRect().bottom + 10;
  return 148;
}

export default function AboutPage({ onSearch, onNavigate }: AboutPageProps) {
  const [activeCategory, setActiveCategory] = useState<AboutCategoryId>('all');
  const [forceOpenId, setForceOpenId] = useState<string | null>(null);
  const clickScrollLock = useRef(false);
  const clickScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navBtnRefs = useRef<Partial<Record<AboutCategoryId, HTMLButtonElement | null>>>({});

  const scrollToSection = (sectionId: string, categoryId: AboutCategoryId) => {
    setActiveCategory(categoryId);
    clickScrollLock.current = true;
    if (clickScrollTimer.current) clearTimeout(clickScrollTimer.current);

    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    clickScrollTimer.current = setTimeout(() => {
      clickScrollLock.current = false;
    }, 720);
  };

  useEffect(() => {
    const syncActiveFromScroll = () => {
      if (clickScrollLock.current) return;

      const anchor = getAboutScrollSpyAnchor();
      let current: AboutCategoryId | null = null;

      for (const cat of SCROLL_SPY_SECTIONS) {
        const el = document.getElementById(cat.sectionId);
        if (el && el.getBoundingClientRect().top <= anchor) {
          current = cat.id;
        }
      }

      if (current) {
        setActiveCategory((prev) => (prev === current ? prev : current));
      }
    };

    syncActiveFromScroll();
    window.addEventListener('scroll', syncActiveFromScroll, { passive: true });
    window.addEventListener('resize', syncActiveFromScroll);
    return () => {
      window.removeEventListener('scroll', syncActiveFromScroll);
      window.removeEventListener('resize', syncActiveFromScroll);
      if (clickScrollTimer.current) clearTimeout(clickScrollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (activeCategory === 'all') return;
    const btn = navBtnRefs.current[activeCategory];
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCategory]);

  const handleFeatureSelect = (feature: CatalogFeature) => {
    setForceOpenId(feature.id);
    scrollToSection(feature.sectionId, feature.category);
  };

  const showAiExcel = isWebAiExcelEnabled();
  const showPc = isWebPcDownloadEnabled();
  const webPlatformExclusive = PLATFORM_SPLIT.web.exclusive.filter(
    (f) => f.id !== 'excel' || showAiExcel
  );
  const installPlatformExclusive = PLATFORM_SPLIT.install.exclusive.filter(
    (f) => showPc || f.id !== 'remote'
  );
  const webExclusiveFeatures = WEB_EXCLUSIVE_FEATURES.filter(
    (item) => item.id !== 'web-excel' || showAiExcel
  );
  const installExclusiveFeatures = INSTALL_EXCLUSIVE_FEATURES.filter(
    (item) => showPc || item.id !== 'remote'
  );
  const aboutHeroSubtitle = showPc
    ? ABOUT_HERO.subtitle
    : 'www.vlue.kr에서 기관을 확인하고, 모바일 앱에서 실시간으로 보호받으세요. 하나의 계정으로 데이터가 연결됩니다.';
  const installSectionTitle = showPc ? 'PC·모바일 설치 프로그램' : '모바일 앱';
  const installCtaLabel = showPc ? 'PC·모바일 설치' : '모바일 앱 설치';
  const syncPrinciples = SYNC_PRINCIPLES.map((item) =>
    item.id === 'sync-one' && !showPc
      ? { ...item, summary: '웹·모바일 = 한 사용자' }
      : item
  );

  const excelNav = () => {
    if (showAiExcel) onNavigate('exceleditor');
  };

  return (
    <main className="min-h-screen bg-[#e8eef5] pt-6">
      <section className="relative px-4 pt-10 pb-4 sm:pt-12" id="about-overview">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a5f] via-[#2563eb]/90 to-[#e8eef5] pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto text-center text-white pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-white/15 border border-white/25 text-xs font-semibold">
            <VlueBrandMark size={14} className="brightness-0 invert" />
            {ABOUT_HERO.badge}
          </div>
          <h1
            className="text-3xl sm:text-4xl font-black mb-4 whitespace-pre-line drop-shadow-sm"
            style={{ letterSpacing: '-0.035em', lineHeight: 1.25 }}
          >
            {ABOUT_HERO.title}
          </h1>
          <div className="max-w-2xl mx-auto rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm px-5 py-4 text-left">
            <p className="text-sm font-black uppercase tracking-wide text-primary-100 mb-2">회사소개</p>
            <p className="text-white text-base sm:text-lg leading-relaxed font-medium" style={{ wordBreak: 'keep-all' }}>
              {ABOUT_HERO.companyLead}
            </p>
            <p className="mt-3 text-sm font-semibold text-primary-100/95">
              {ABOUT_HERO.companyPoweredBy}
            </p>
          </div>
          <p className="text-white/90 text-base leading-relaxed max-w-2xl mx-auto mt-4 font-medium" style={{ wordBreak: 'keep-all' }}>
            {aboutHeroSubtitle}
          </p>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto -mt-1 px-0 sm:px-2">
          <AboutSearchHub
            onInstitutionSearch={onSearch}
            activeCategory={activeCategory}
            onFeatureSelect={handleFeatureSelect}
          />
          <p className="text-center text-base text-slate-700 mt-4 font-semibold" style={{ wordBreak: 'keep-all' }}>
            {ABOUT_HERO.searchHint}
          </p>
        </div>
      </section>

      <nav aria-label="서비스소개 섹션" className="mkt-about-section-nav">
        <div className="max-w-6xl mx-auto mkt-about-section-nav__inner">
          {SCROLL_SPY_SECTIONS.map((cat) => (
            <button
              key={cat.id}
              ref={(el) => { navBtnRefs.current[cat.id] = el; }}
              type="button"
              aria-current={activeCategory === cat.id ? 'true' : undefined}
              onClick={() => scrollToSection(cat.sectionId, cat.id)}
              className={`mkt-about-section-nav__btn${
                activeCategory === cat.id ? ' mkt-about-section-nav__btn--active' : ''
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* 회사소개 */}
        <section id="about-company" className="mkt-scroll-section">
          <SectionHead
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                <VlueBrandMark size={14} />
                회사소개
              </span>
            }
            title="VLUE가 하는 일"
            desc={COMPANY_PROFILE.mission}
          />
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            {COMPANY_PROFILE.pillars.map((p, i) => {
              const Icon = PILLAR_ICONS[i];
              return (
                <BentoCard key={p.id} icon={Icon} title={p.title} desc={p.desc} accent={i === 0 ? 'primary' : i === 1 ? 'indigo' : 'amber'} />
              );
            })}
          </div>
          <div className="rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-600 to-primary-700 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4">
            <Target className="w-10 h-10 shrink-0 opacity-90" />
            <div>
              <p className="text-sm font-bold text-primary-100 uppercase tracking-wide">비전</p>
              <p className="text-base sm:text-lg font-bold mt-2 leading-relaxed">{COMPANY_PROFILE.vision}</p>
            </div>
          </div>
        </section>

        {/* 플랫폼 */}
        <section id="about-platform" className="mkt-scroll-section">
          <SectionHead
            tone="primary"
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-full">
                <Globe className="w-3.5 h-3.5" />
                플랫폼
              </span>
            }
            title="웹과 설치형, 하나의 VLUE"
            desc={PLATFORM_SPLIT.syncNote}
          />

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <div className="rounded-3xl border border-primary-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-4 text-white">
                <Globe className="w-6 h-6 mb-2 opacity-90" />
                <p className="text-lg font-black">{PLATFORM_SPLIT.web.title}</p>
                <p className="text-sm text-primary-100 mt-0.5">{PLATFORM_SPLIT.web.tagline}</p>
              </div>
              <div className="p-4 grid gap-3">
                {webPlatformExclusive.map((f, i) => (
                  <BentoCard
                    key={f.id}
                    icon={WEB_ICONS[i] ?? Search}
                    title={f.title}
                    desc={f.desc}
                    accent="primary"
                    onClick={f.id === 'excel' ? excelNav : f.id === 'search' ? () => onNavigate('home') : undefined}
                  />
                ))}
              </div>
              <div className="px-4 pb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{PLATFORM_SPLIT.web.sharedLabel}</p>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_SPLIT.web.shared.map((s) => (
                    <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-5 py-4 text-white">
                <Monitor className="w-6 h-6 mb-2 opacity-90" />
                <p className="text-lg font-black">{showPc ? PLATFORM_SPLIT.install.title : '설치형 (모바일)'}</p>
                <p className="text-sm text-indigo-100 mt-0.5">{PLATFORM_SPLIT.install.tagline}</p>
              </div>
              <div className="p-4 grid gap-3">
                {installPlatformExclusive.map((f) => {
                  const icons = { remote: Radio, alert: Bell, hw: Cpu };
                  const Icon = icons[f.id as keyof typeof icons] ?? Smartphone;
                  return <BentoCard key={f.id} icon={Icon} title={f.title} desc={f.desc} accent="indigo" />;
                })}
              </div>
              <div className="px-4 pb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{PLATFORM_SPLIT.install.sharedLabel}</p>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_SPLIT.install.shared.map((s) => (
                    <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5 mb-4 bg-slate-900 text-white">
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
              <span className="px-3 py-1.5 rounded-lg bg-white/10">www 웹</span>
              <span className="text-white/40">↔</span>
              <span className="px-3 py-1.5 rounded-lg bg-primary-500">@vlue/api</span>
              <span className="text-white/40">↔</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/10">{showPc ? 'PC · 모바일 설치' : '모바일 앱'}</span>
            </div>
          </div>
          <ServiceAccordion items={syncPrinciples} forceOpenId={forceOpenId} />
        </section>

        {/* 보이스피싱 */}
        <section id="about-risk" className="mkt-scroll-section">
          <SectionHead
            tone="danger"
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                보이스피싱
              </span>
            }
            title="보이스피싱은 지금도 진화 중입니다"
            desc="AI 딥페이크·기관 사칭 수법이 고도화되며 피해 규모는 매년 급증합니다."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {PROBLEM_STATS.map(({ value, label, sub }) => (
              <div key={label} className="card p-6 text-center border-l-4 border-l-red-400 hover:shadow-md transition-shadow">
                <div className="text-3xl sm:text-4xl font-black text-red-500">{value}</div>
                <div className="text-sm font-bold text-gray-900 mt-2">{label}</div>
                <div className="text-xs text-gray-500 mt-1">{sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <PhishingChartFull />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {PHISHING_WARNINGS.map((w, i) => {
                const Icon = WARNING_ICONS[i];
                const style = WARNING_COLORS[i];
                return (
                  <div key={w.title} className={`card p-4 border ${style.border} ${style.bg}`}>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                        <Icon className={`w-5 h-5 ${style.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{w.title}</p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{w.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="card p-4 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                <p className="text-xs font-bold text-white/80 mb-2">피해 신고 즉시 연락</p>
                <div className="space-y-1.5 text-sm font-bold">
                  <p>금융감독원 <span className="font-inter text-lg">1332</span></p>
                  <p>경찰청 <span className="font-inter text-lg">112</span></p>
                  <p>인터넷진흥원 <span className="font-inter text-lg">118</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PHISHING_TIPS.map((tip, i) => (
              <div key={tip} className="flex gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {i + 1}
                </span>
                <span className="leading-snug">{tip}</span>
              </div>
            ))}
        </div>
      </section>

        {/* VLUE 대응 */}
        <section id="about-protect" className="mkt-scroll-section">
          <SectionHead
            tone="primary"
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5" />
                VLUE 대응
              </span>
            }
            title="이중 검증으로 즉시 판별"
            desc="공공데이터와 VLUE 인증 DB를 함께 조회해 위험도를 안내합니다."
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {SOLUTION_STEPS.map((step, i) => {
              const Icon = SOLUTION_ICONS[i];
              return (
                <div key={step.title} className="relative card p-4 pt-8 overflow-hidden">
                  <span className="absolute top-3 left-4 text-2xl font-black text-primary-100 font-inter">{i + 1}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <p className="text-xs font-bold text-primary-800">{step.title}</p>
                  <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card p-5 border-primary-100 bg-primary-50/40">
              <p className="text-xs font-bold text-primary-800 mb-2">설치형 앱 · 실시간 대응</p>
              <ul className="space-y-2">
                {VOICE_PHISHING_APP_LINES.map((line) => (
                  <li key={line} className="flex gap-2 text-sm text-slate-800">
                    <CheckCircle className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5 flex flex-col justify-center">
              <p className="text-sm font-bold text-gray-900 mb-4 text-center">VLUE 이중 검증 흐름</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {ARCHITECTURE_FLOW.map((item, i) => (
                  <Fragment key={item.label}>
                    {i > 0 ? <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block" /> : null}
                    <div className="rounded-xl bg-primary-50 border border-primary-100 px-3 py-2 text-center min-w-[72px]">
                      <p className="text-[11px] font-bold text-primary-800">{item.label}</p>
                      <p className="text-[10px] text-slate-500">{item.sub}</p>
                </div>
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 웹 전용 */}
        <section id="about-web" className="mkt-scroll-section">
          <SectionHead
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                <Globe className="w-3.5 h-3.5" />
                웹 전용
              </span>
            }
            title="www에서만 제공하는 기능"
            desc={
              showAiExcel
                ? '통합 검색·AI엑셀에디터는 브라우저에서 바로 사용합니다. 공통 서비스는 설치형 앱과 데이터가 연결됩니다.'
                : '통합 기관 검색은 브라우저에서 바로 사용합니다. 공통 서비스는 설치형 앱과 데이터가 연결됩니다.'
            }
          />
          <div className="grid sm:grid-cols-2 gap-4 mb-5 max-w-2xl">
            {webExclusiveFeatures.map((item, i) => (
              <BentoCard
                key={item.id}
                icon={WEB_ICONS[i] ?? Search}
                title={item.title}
                desc={item.summary}
                accent="primary"
                onClick={
                  item.id === 'web-excel'
                    ? excelNav
                    : item.id === 'web-search'
                      ? () => onNavigate('home')
                      : undefined
                }
              />
            ))}
          </div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">웹·앱 공통 서비스</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SHARED_SERVICES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => s.nav && onNavigate(s.nav)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left hover:border-primary-300 hover:shadow-sm transition-all min-w-[140px]"
              >
                <p className="text-xs font-bold text-slate-800">{s.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.summary}</p>
              </button>
            ))}
          </div>
          <ServiceAccordion items={webExclusiveFeatures} forceOpenId={forceOpenId} />
        </section>

        {/* 설치형 */}
        <section id="about-install" className="mkt-scroll-section bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
          <SectionHead
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                <Smartphone className="w-3.5 h-3.5" />
                설치형 앱
              </span>
            }
            title={installSectionTitle}
            desc="리모컨·실시간 알림·하드웨어 연동은 모바일 앱 설치 후 이용합니다. 브라우저 웹앱(/app)은 제공하지 않습니다."
          />

          <div className="flex flex-wrap gap-2 mb-6">
            {INSTALL_HIGHLIGHTS.map((f) => (
              <span key={f} className="rounded-full bg-indigo-600 text-white px-3 py-1 text-xs font-bold shadow-sm">
                {f}
              </span>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {installExclusiveFeatures.map((item) => {
              const Mapped = INSTALL_ICON_MAP[item.id] ?? Shield;
              return (
                <BentoCard
                  key={item.id}
                  icon={Mapped}
                  title={item.title}
                  desc={item.summary}
                  accent="indigo"
                />
              );
            })}
                  </div>

          <ServiceAccordion items={installExclusiveFeatures} forceOpenId={forceOpenId} className="mb-6" />

          <div className="flex flex-wrap gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-bold text-slate-900">{installCtaLabel} 안내</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {showAiExcel
                  ? '실시간 보호·리모컨·명함 레터링은 설치형 프로그램에서 이용하세요. 웹 AI엑셀·검색과 동일 계정으로 로그인됩니다.'
                  : '실시간 보호·리모컨·명함 레터링은 설치형 프로그램에서 이용하세요. 웹 검색과 동일 계정으로 로그인됩니다.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('download')}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 shrink-0"
            >
              <Download className="w-4 h-4" />
              설치 다운로드
            </button>
        </div>
      </section>

        {/* 요금제 */}
        <section id="about-pricing" className="mkt-scroll-section">
          <SectionHead
            badge={
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                멤버십 · 요금제
              </span>
            }
            title="V1 멤버십 · 요금제"
            desc="블루 쇼케이스·디지털 인증명함·가족보호 중심. 웹·앱 동일 요금제입니다."
          />

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {MARKETING_PRICING_TIERS.map((marketing) => {
              const plan =
                marketing.id === 'free' || marketing.id === 'paid' || marketing.id === 'b2b'
                  ? MEMBERSHIP_PLAN_DETAILS[marketing.id]
                  : null;
              const border =
                marketing.id === 'paid'
                  ? 'border-t-primary-500'
                  : marketing.id === 'b2b'
                    ? 'border-t-indigo-600'
                    : marketing.id === 'soho_broadcast'
                      ? 'border-t-violet-600'
                      : 'border-t-slate-400';
              return (
                <div
                  key={marketing.id}
                  className={`card p-5 border-t-4 ${border} ${marketing.id === 'paid' ? 'ring-2 ring-primary-100' : ''}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {plan?.badge || '옵션'}
                  </span>
                  <p className="text-lg font-black text-gray-900 mt-1">{marketing.name}</p>
                  <div className="mt-2">
                    {marketing.price === 0 ? (
                      <p className="text-sm font-bold text-primary-700">무료</p>
                    ) : (
                      <>
                        {marketing.listPrice ? (
                          <p className="text-xs text-slate-400 line-through">
                            {marketing.listPrice.toLocaleString('ko-KR')}원
                          </p>
                        ) : null}
                        <p className="text-sm font-bold text-primary-700">
                          {marketing.price.toLocaleString('ko-KR')}원/{marketing.period}
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    {plan?.headline || marketing.description}
                  </p>
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {(plan?.bullets || marketing.features).slice(0, 5).map((line) => (
                      <li key={line} className="flex gap-2 text-xs text-gray-700 leading-relaxed">
                        <CheckCircle className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  {'priceNote' in marketing && marketing.priceNote ? (
                    <p className="mt-3 text-[10px] text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5">
                      {marketing.priceNote}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">혜택 비교표</p>
          <MembershipBenefitsTable />

          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mt-8 mb-3">상세 설명</p>
          <ServiceAccordion items={PRICING_TIER_FEATURES} forceOpenId={forceOpenId} className="mb-5" />

          <button type="button" onClick={() => onNavigate('pricing')} className="btn-primary w-full sm:w-auto">
            인증신청 페이지로 이동
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        {/* 신뢰·비전 */}
        <section id="about-trust" className="mkt-scroll-section">
          <SectionHead
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-full">
                <Award className="w-3.5 h-3.5" />
                신뢰 · 비전
              </span>
            }
            title="검증된 데이터, 함께 성장합니다"
            desc="정부·국제 인증 연계와 로드맵으로 신뢰를 쌓아갑니다."
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {TRUST_ITEMS.map(({ label, desc }) => (
              <div key={label} className="card p-4 flex gap-3 hover:border-primary-200 hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {VISION_CARDS.map(({ title, desc, tag }) => (
              <div key={title} className="card p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary-50 opacity-80" />
                <span className="relative text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
                <Lock className="relative w-5 h-5 text-primary-600 mb-3 mt-2" />
                <p className="relative text-sm font-bold text-gray-900">{title}</p>
                <p className="relative text-xs text-gray-500 mt-2 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="card p-6 bg-gradient-to-br from-primary-50/80 to-white">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="text-center sm:text-left shrink-0">
                <p className="text-xs font-semibold text-primary-600">국내 사이버보안 시장 규모</p>
                <p className="text-4xl font-black text-gray-900 mt-1">
                  12.4<span className="text-xl text-primary-500">조원</span>
                </p>
                <p className="text-xs text-gray-500">2027년 예상 · CAGR 14.2%</p>
              </div>
              <div className="flex-1 w-full space-y-3">
                {MARKET_BARS.map(({ label, pct }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className="text-gray-400">{pct}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

        <section className="pb-8">
          <div className="card p-8 sm:p-10 bg-gradient-to-br from-primary-600 to-primary-700 border-0 text-center text-white">
            <Eye className="w-10 h-10 mx-auto mb-3 opacity-90" />
            <h2 className="text-xl font-black mb-2">웹에서 확인하고, 설치형으로 보호까지</h2>
            <p className="text-primary-100 text-sm max-w-md mx-auto mb-6" style={{ wordBreak: 'keep-all' }}>
              {showAiExcel
                ? showPc
                  ? '기관 검색·AI엑셀에디터는 www에서, 실시간 경보·명함·가족 보호는 PC·모바일 설치 프로그램에서 이어가세요.'
                  : '기관 검색·AI엑셀에디터는 www에서, 실시간 경보·명함·가족 보호는 모바일 앱에서 이어가세요.'
                : showPc
                  ? '기관 검색은 www에서, 실시간 경보·명함·가족 보호는 PC·모바일 설치 프로그램에서 이어가세요.'
                  : '기관 검색은 www에서, 실시간 경보·명함·가족 보호는 모바일 앱에서 이어가세요.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 font-bold text-sm rounded-2xl"
              >
                홈에서 기관 검색
              </button>
              <button
                type="button"
                onClick={() => onNavigate('download')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 border border-white/30 text-white font-bold text-sm rounded-2xl"
              >
                <Download className="w-4 h-4" />
                {installCtaLabel}
              </button>
            </div>
          </div>
        </section>
        </div>
    </main>
  );
}
