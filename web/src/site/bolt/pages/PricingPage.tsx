import { useEffect, useState } from 'react';
import { Star, Zap, ArrowRight, CreditCard, Building2, Sparkles, Phone, CheckCircle } from 'lucide-react';
import { pricingTiers } from '../data/mockData';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import {
  LetteringBigPushMarketingPreview,
  LetteringUnverifiedBigPushPreview,
  LetteringMarketingComparePanel,
  LETTERING_UNVERIFIED_SPOOF_NUMBER,
  BIG_PUSH_FLOW_STEPS,
  type PushExampleId,
  type MarketingViewMode,
} from '../components/LetteringMarketingDemo';
import SensitiveRightClickGuard from '../components/SensitiveRightClickGuard';

interface PricingPageProps {
  user?: { email: string } | null;
  onLoginClick?: () => void;
}

function BrandTierIcon({ className }: { className?: string }) {
  return <VlueBrandMark size={14} className={className} />;
}
const TIER_ICONS = [BrandTierIcon, Zap, Star];
const TIER_COLORS = {
  gray: { header: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
  blue: { header: 'bg-primary-600', badge: 'bg-white/20 text-white', border: 'border-primary-300' },
  gold: { header: 'bg-gray-900', badge: 'bg-amber-400/20 text-amber-300', border: 'border-gray-700' },
};

type DeviceGrade = 'basic' | 'standard' | 'premium';

const GRADE_TO_PUSH: Record<'basic' | 'standard', PushExampleId> = {
  basic: 'police112',
  standard: 'fss1332',
};

const CARD_PART_GUIDE: Record<DeviceGrade, { title: string; intro: string; parts: { label: string; desc: string }[] }> = {
  basic: {
    title: '예시 112 경찰청 — Lettering 빅푸시',
    intro: '앱과 동일하게 실제 통화 화면 위에 VLUE Lettering이 올라오고, ▼ 펼치면 디지털인증명함(경찰청·112)이 표시됩니다.',
    parts: [
      { label: 'VLUE 작동중 바', desc: '녹음·통화 상태와 함께 빅푸시가 수신 UI 위에 고정됩니다.' },
      { label: '경찰청 · 112', desc: '인증 마크·기관명·대표번호가 요약으로 먼저 보입니다.' },
      { label: '디지털인증명함', desc: 'T·F·H·E·QR 포함 — 앱 명함 설정과 동일 레이아웃.' },
      { label: '인증정보·저장·신고', desc: '펼친 후 인증정보 / 명함저장 / 신고·차단 버튼.' },
    ],
  },
  standard: {
    title: '예시 1332 금융감독원',
    intro: '금융감독원 대표번호도 같은 빅푸시·명함 송출 UX입니다. 유료 인증 기관은 골드 톤 Lettering으로 강조됩니다.',
    parts: [
      { label: '실제 수신 화면', desc: 'Galaxy·iOS 통화 UI 스크린 위 오버레이 (앱 미리보기와 동일).' },
      { label: '금융감독원 · 1332', desc: '기관명·민원센터·번호가 명함에 실시간 송출.' },
      { label: '명함 펼침', desc: '「명함 펼치기」로 전체 디지털인증명함 확인.' },
      { label: '사칭 경고', desc: '명함 하단 VLUE 보안 안내 문구 자동 포함.' },
    ],
  },
  premium: {
    title: '미인증자 — VLUE 미등록 번호',
    intro: `${LETTERING_UNVERIFIED_SPOOF_NUMBER}처럼 VLUE에 등록되지 않은 번호는 빅푸시·디지털인증명함이 표시되지 않습니다. 앱과 동일한 미등록 UI만 노출됩니다.`,
    parts: [
      { label: '통화 화면 번호', desc: '실제 수신 번호만 표시 — 기관명·인증 마크 없음.' },
      { label: '빅푸시 요약', desc: '「?」 아이콘과 번호, 신고·제보 이력 안내.' },
      { label: '펼침', desc: '신고·제보 이력 패널(명함 없음).' },
      { label: '신고/차단', desc: '사칭·스팸 신고 후 차단 — 앱 Lettering과 동일.' },
    ],
  },
};

export default function PricingPage({ user, onLoginClick }: PricingPageProps) {
  const [activeGrade, setActiveGrade] = useState<DeviceGrade>('standard');
  const [tierView, setTierView] = useState<MarketingViewMode>('push');
  const [compareTab, setCompareTab] = useState<'unverified' | PushExampleId>('fss1332');

  useEffect(() => {
    setTierView('push');
  }, [activeGrade]);

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-primary-50 border border-primary-200 text-primary-600 text-xs font-semibold">
            <VlueBrandMark size={14} />
            인증신청
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3" style={{ letterSpacing: '-0.035em' }}>무료 · 유료 · 기업 멤버십</h1>
          <p className="text-gray-500 text-base max-w-lg mx-auto leading-relaxed" style={{ wordBreak: 'keep-all' }}>
            VLUE 앱과 동일한 3단계 요금제입니다.<br />
            유료는 추천인 코드 할인(12개월 30% → 이후 15% 영구), 기업은 10회선 이상 단체 가입입니다.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {pricingTiers.map((tier, idx) => {
            const Icon = TIER_ICONS[idx];
            const colors = TIER_COLORS[tier.color as keyof typeof TIER_COLORS] ?? TIER_COLORS.gray;
            const isBlue = tier.color === 'blue';
            const isGold = tier.color === 'gold';

            return (
              <div
                key={tier.id}
                className={`rounded-3xl border overflow-hidden relative flex flex-col shadow-card ${colors.border} ${isBlue ? 'scale-[1.02] shadow-card-hover' : ''}`}
              >
                {tier.recommended && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-white rounded-full text-primary-600 text-xs font-black shadow-sm z-10">
                    추천
                  </div>
                )}
                <div className={`${colors.header} px-6 pt-6 pb-8`}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${colors.badge}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {tier.name}
                  </div>
                  <div className={`mb-2 ${isBlue || isGold ? 'text-white' : 'text-gray-900'}`}>
                    <span className="text-4xl font-black font-inter">
                      {tier.price === 0 ? '무료' : tier.price.toLocaleString()}
                    </span>
                    {tier.price > 0 && <span className="text-base font-medium">원/{tier.period}</span>}
                  </div>
                  <p className={`text-sm ${isBlue || isGold ? 'text-white/70' : 'text-gray-500'}`}>{tier.description}</p>
                  {'priceNote' in tier && tier.priceNote ? (
                    <p className={`text-xs mt-2 ${isBlue || isGold ? 'text-white/55' : 'text-gray-400'}`}>{tier.priceNote}</p>
                  ) : null}
                </div>

                <div className="bg-white px-6 py-6 flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                        <span style={{ wordBreak: 'keep-all' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => { if (!user && onLoginClick) onLoginClick(); }}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 ${
                      isBlue ? 'btn-primary' : isGold
                        ? 'bg-amber-400 text-gray-900 hover:bg-amber-300 font-bold'
                        : 'btn-secondary'
                    }`}
                  >
                    {tier.price === 0 ? '무료로 시작하기' : '인증 신청하기'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold">
              <Phone className="w-3.5 h-3.5" />
              디지털 인증 명함 · 빅푸시 송출
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
              수신 화면 위에 명함이 뜹니다
            </h2>
            <p className="text-gray-500 text-sm max-w-2xl mx-auto" style={{ wordBreak: 'keep-all' }}>
              실제 Galaxy·iOS <strong className="text-gray-800">통화 화면</strong> 위에 VLUE Lettering 빅푸시가 올라오고, 펼치면{' '}
              <strong className="text-primary-700">앱과 동일한 디지털인증명함</strong>이 표시됩니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {(['basic', 'standard', 'premium'] as DeviceGrade[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setActiveGrade(g)}
                className={`px-5 py-2.5 text-xs font-bold rounded-2xl border transition-all ${
                  activeGrade === g
                    ? g === 'premium'
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                      : g === 'standard'
                      ? 'bg-amber-400 text-gray-900 border-amber-400 shadow-md'
                      : 'bg-primary-500 text-white border-primary-500 shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {g === 'basic' ? '112 경찰청' : g === 'standard' ? '1332 금융감독원' : '미인증자'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto mb-8">
            {BIG_PUSH_FLOW_STEPS.map((s) => (
              <div key={s.step} className="rounded-2xl border border-primary-100 bg-primary-50/80 px-4 py-3 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-black">
                  {s.step}
                </span>
                <p className="text-sm font-bold text-gray-900 mt-2">{s.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="overflow-visible bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-10 lg:p-12">
            <div className="flex flex-col gap-10 overflow-visible">
              <SensitiveRightClickGuard className="w-full overflow-visible">
                {activeGrade === 'premium' ? (
                  <LetteringUnverifiedBigPushPreview view={tierView} onViewChange={setTierView} />
                ) : (
                  <LetteringBigPushMarketingPreview
                    exampleId={GRADE_TO_PUSH[activeGrade]}
                    view={tierView}
                    onViewChange={setTierView}
                  />
                )}
              </SensitiveRightClickGuard>

              <div className="text-white min-w-0 max-w-2xl mx-auto w-full lg:max-w-none lg:mx-0">
                {(() => {
                  const guide = CARD_PART_GUIDE[activeGrade];
                  const icon =
                    activeGrade === 'premium' ? (
                      <Sparkles className="w-5 h-5 text-cyan-300" />
                    ) : activeGrade === 'standard' ? (
                      <Star className="w-5 h-5 text-amber-400" />
                    ) : (
                      <VlueBrandMark size={20} />
                    );
                  return (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            activeGrade === 'premium'
                              ? ''
                              : activeGrade === 'standard'
                                ? 'bg-amber-500/20 border border-amber-500/40'
                                : 'bg-primary-500/20 border border-primary-500/40'
                          }`}
                          style={
                            activeGrade === 'premium'
                              ? { background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)' }
                              : undefined
                          }
                        >
                          {icon}
                        </div>
                        <span className="font-black text-xl" style={{ letterSpacing: '-0.02em' }}>
                          {guide.title}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm mb-5 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                        {guide.intro}
                      </p>
                      <p className="text-[11px] font-bold text-white/50 uppercase tracking-wide mb-3">명함 구성 안내</p>
                      <ul className="space-y-2.5">
                        {guide.parts.map((part) => (
                          <li
                            key={part.label}
                            className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5"
                          >
                            <p className="text-sm font-bold text-white/90">{part.label}</p>
                            <p className="text-xs text-white/55 mt-0.5 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                              {part.desc}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5" />
              디지털 인증 명함
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
              빅푸시 없음 vs 112·1332 인증 명함
            </h2>
            <p className="text-gray-500 text-sm max-w-2xl mx-auto" style={{ wordBreak: 'keep-all' }}>
              사칭은 <strong className="text-gray-800">{LETTERING_UNVERIFIED_SPOOF_NUMBER}</strong>처럼 VLUE 미등록 번호입니다.
              등록된 <strong className="text-gray-800">112·1332</strong>만 통화 화면·빅푸시·명함에 동일하게 표시됩니다.
            </p>
          </div>

          <div className="overflow-visible bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800 rounded-3xl p-8 lg:p-12">
            <p className="text-center text-primary-200 text-xs font-bold mb-8 max-w-2xl mx-auto" style={{ wordBreak: 'keep-all' }}>
              앱 Lettering과 동일 — 뒤: 실제 통화 UI · 앞: VLUE 빅푸시(접힘/펼침) · 펼치면 디지털인증명함
            </p>
            <SensitiveRightClickGuard>
              <LetteringMarketingComparePanel tab={compareTab} onTabChange={setCompareTab} />
            </SensitiveRightClickGuard>

            <div className="mt-10 max-w-3xl mx-auto grid sm:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <p className="text-white font-bold text-sm mb-2">빅푸시란?</p>
                <p className="text-white/55 text-xs leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  앱의 <strong className="text-primary-200">VLUE Lettering</strong>이 실제 Galaxy·iOS 통화 화면 위에 올라옵니다.
                  접힌 상태에서 기관·번호를 보고, 펼치면 디지털인증명함 전체가 표시됩니다.
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <p className="text-white font-bold text-sm mb-2">명함에 담기는 정보</p>
                <ul className="text-white/55 text-xs space-y-1.5">
                  <li>· VLUE 인증 마크 + 공공/금융/사업자 구분</li>
                  <li>· 기관명(경찰청·금융감독원 등) · 대표번호</li>
                  <li>· 멤버십 테두리(연블루 / 골드 / 홀로)</li>
                  <li>· 사칭 경고 안내 문구</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 mb-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">B2B 기업 맞춤 요금제</h3>
                  <p className="text-white/60 text-xs">50인 이상 기업 대량 가입 · 별도 협의</p>
                </div>
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-4" style={{ wordBreak: 'keep-all' }}>
                임직원 전체 VLUE 인증, 전용 API, 보안 교육 패키지, 전담 보안 매니저 배정 등 기업 맞춤형 솔루션을 제공합니다.
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {['대량 임직원 인증', '전용 관리 콘솔', '커스텀 API 연동', '월간 보안 리포트'].map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-white/80">
                    <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => { if (!user && onLoginClick) onLoginClick(); }}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-sm rounded-2xl transition-all whitespace-nowrap flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                B2B 기업 상담 신청
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8">
          <div className="flex items-start gap-2.5 max-w-2xl mx-auto">
            <VlueBrandMark size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-gray-600 text-xs leading-relaxed" style={{ wordBreak: 'keep-all' }}>
              <strong className="text-gray-800">보안 안내문구 자동 표시:</strong> 모든 디지털 명함 하단에 &ldquo;본 명함은 VLUE 인증 회원임을 증명합니다. 인증된 상태 중 어떠한 경우에도 유선상 송금이나 개인정보를 요구하지 않으니 사칭에 주의하십시오.&rdquo; 문구가 자동으로 포함됩니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
