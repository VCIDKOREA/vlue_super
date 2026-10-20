import { useState } from "react";
import {
  CheckCircle,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Zap,
  Building2,
  Phone,
  Layers
} from "lucide-react";
import { VlueBrandMark } from "./VlueBrandLogo.jsx";
import PricingDetailModal from "./PricingDetailModal.jsx";

/**
 * 4개 컴팩트 요금제 카드 정의 (카드당 최대 3~4개 필수 노출 항목으로 제한)
 * 1) 타이틀 & 배지
 * 2) 대표 월 이용금액 & 정가 대비 할인율
 * 3) 핵심 요약 혜택 3개 Bullet List (CheckCircle 아이콘)
 * 4) [상세 혜택 보기 >] 버튼
 * 5) 하단 메인 CTA 버튼
 */
export const COMPACT_PRICING_TIERS = [
  {
    id: "free",
    name: "일반 회원",
    badge: "기본 무료",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    theme: "slate",
    price: 0,
    listPrice: null,
    discountBadge: "영구 무료 제공",
    period: "무료",
    shortDesc: "발신자 확인 및 기본 쇼케이스 체험",
    bullets: [
      "수신 화면 발신자 신원·인증 확인 (스팸/사기 제보)",
      "블루 쇼케이스 1페이지 & 기본 BGM 1곡 무료 제공",
      "케이스함 저장 및 소셜 링크 연동 지원"
    ],
    ctaText: "앱에서 무료로 시작",
    ctaStyle: "bg-slate-100 hover:bg-slate-200 text-slate-800",
    isRecommended: false
  },
  {
    id: "paid",
    name: "유료 회원",
    badge: "BEST · 초특가 50%",
    badgeColor: "bg-blue-600 text-white shadow-xs",
    theme: "blue",
    price: 14100,
    listPrice: 28300,
    discountBadge: "50% 할인",
    discountSubNote: "추천인 입력 시 월 9,900원",
    period: "월",
    shortDesc: "디지털 인증명함 & 5페이지 풀 쇼케이스",
    bullets: [
      "디지털 인증명함(DCC) & 블루 쇼케이스 5페이지 풀 송출",
      "온가족 안심 '가족보호' 시스템 (최대 4인 등록)",
      "풀 BGM 플레이어, 비즈니스 링크 & 커스텀 스타일"
    ],
    ctaText: "앱에서 가입·결제하기",
    ctaStyle: "bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20",
    isRecommended: true
  },
  {
    id: "extension_line",
    name: "내선·대표번호 추가",
    badge: "회선 확장",
    badgeColor: "bg-violet-100 text-violet-700 border-violet-200",
    theme: "purple",
    price: 5200,
    listPrice: 14100,
    discountBadge: "63% 할인",
    discountSubNote: "추천인 할인 제외",
    period: "회선/월",
    shortDesc: "사업장 유선·대표번호와 직통 휴대폰 연동",
    bullets: [
      "사업장 대표번호(02/1588 등) 및 내선 번호 쇼케이스 연동",
      "직통 휴대폰과 대표번호 간 발신자 브랜딩 실시간 일치",
      "대표자 모바일 플랜 결제 후 무제한 개별 회선 추가"
    ],
    ctaText: "회선 추가 신청하기",
    ctaStyle: "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20",
    isRecommended: false
  },
  {
    id: "b2b",
    name: "B2B 풀 패키지",
    badge: "기업 전용",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    theme: "gold",
    price: 14100,
    listPrice: 28300,
    discountBadge: "임직원 50%",
    discountSubNote: "대표 관리자 월 99,000원",
    period: "모바일 회선/월",
    shortDesc: "기업 CI/BI 연동 & 전사 임직원 일괄 인증",
    bullets: [
      "기업 전용 CI/BI 워터마크 & 대표번호 단체 인증명함",
      "임직원 모바일 회선 전원 풀 쇼케이스 및 명함 배포",
      "관리자 전용 일괄 라이선스 관리 및 조직도/DCC 연동"
    ],
    ctaText: "B2B 상담·가입하기",
    ctaStyle: "bg-amber-400 hover:bg-amber-300 text-slate-900 font-black shadow-md shadow-amber-400/20",
    isRecommended: false
  }
];

/**
 * PricingSection: 컴팩트 4개 요금제 카드 그리드 및 상세 혜택 팝업 모달 제공 컴포넌트
 */
export default function PricingSection({
  user,
  onLoginClick,
  onDownloadClick,
  onApplyTier,
  className = ""
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState("paid");

  const handleOpenDetailModal = (tierId) => {
    setSelectedTierId(tierId);
    setModalOpen(true);
  };

  const handleJoinPayAction = (tierId) => {
    if (onApplyTier) {
      onApplyTier(tierId);
      return;
    }
    if (onDownloadClick) {
      onDownloadClick();
      return;
    }
    try {
      window.location.hash = "download";
    } catch {
      if (!user && onLoginClick) onLoginClick();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 4개 컴팩트 요금제 카드 그리드 (동일 세로 높이) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
        {COMPACT_PRICING_TIERS.map((tier) => {
          const isFree = tier.id === "free";
          const isPaid = tier.id === "paid";
          const isExtension = tier.id === "extension_line";
          const isB2b = tier.id === "b2b";

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col h-full rounded-3xl border bg-white p-6 sm:p-7 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1 ${
                isPaid
                  ? "border-primary-400 ring-2 ring-primary-500/20 bg-gradient-to-b from-blue-50/50 via-white to-white scale-[1.01]"
                  : isExtension
                  ? "border-violet-200"
                  : isB2b
                  ? "border-amber-200/90"
                  : "border-slate-200"
              }`}
            >
              {/* 1) 요금제 대표 타이틀 & 배지 */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${tier.badgeColor}`}
                  >
                    {isPaid ? <Sparkles className="w-3 h-3 text-amber-300" /> : null}
                    {tier.badge}
                  </span>
                  {isPaid ? (
                    <span className="text-[11px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                      추천
                    </span>
                  ) : null}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-3.5 tracking-tight">
                  {tier.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1" style={{ wordBreak: "keep-all" }}>
                  {tier.shortDesc}
                </p>
              </div>

              {/* 2) 대표 월 이용금액 & 정가 대비 할인율 */}
              <div className="min-h-[82px] flex flex-col justify-end pt-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  {tier.listPrice ? (
                    <span className="text-xs font-semibold text-slate-400 line-through">
                      정가 {tier.listPrice.toLocaleString("ko-KR")}원
                    </span>
                  ) : null}
                  {tier.discountBadge ? (
                    <span
                      className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                        isFree
                          ? "text-emerald-700 bg-emerald-50"
                          : isPaid
                          ? "text-rose-600 bg-rose-50"
                          : isExtension
                          ? "text-violet-700 bg-violet-50"
                          : "text-amber-700 bg-amber-50"
                      }`}
                    >
                      {tier.discountBadge}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-[32px] font-black font-inter tracking-tight text-slate-900 leading-none">
                    {isFree ? "무료" : `${tier.price.toLocaleString("ko-KR")}원`}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/{tier.period}</span>
                </div>

                {tier.discountSubNote ? (
                  <p className="text-[11px] font-medium text-slate-400 mt-1 truncate">
                    {tier.discountSubNote}
                  </p>
                ) : (
                  <div className="h-[18px]" />
                )}
              </div>

              {/* 3) 핵심 요약 혜택 Bullet List 3개 */}
              <div className="py-4 flex-1">
                <ul className="space-y-2.5">
                  {tier.bullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-[13px] leading-snug text-slate-700"
                    >
                      <CheckCircle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isPaid
                            ? "text-primary-600"
                            : isExtension
                            ? "text-violet-600"
                            : isB2b
                            ? "text-amber-500"
                            : "text-emerald-600"
                        }`}
                      />
                      <span className="font-medium" style={{ wordBreak: "keep-all" }}>
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4) [상세 혜택 보기 >] 우측 화살표 링크 버튼 */}
              <div className="pt-1 pb-3">
                <button
                  type="button"
                  onClick={() => handleOpenDetailModal(tier.id)}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-100/90 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition active:scale-[0.99]"
                  aria-label={`${tier.name} 상세 혜택 보기`}
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-600 transition-colors" />
                    <span>상세 혜택 보기</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              {/* 5) 하단 메인 CTA 버튼 */}
              <div className="mt-auto pt-1">
                <button
                  type="button"
                  onClick={() => handleJoinPayAction(tier.id)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 active:scale-[0.99] ${tier.ctaStyle}`}
                >
                  <span>{tier.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 서비스 제공기간 및 소진 규정 안내 (NHN KCP PG 심사 필수) */}
      <div className="mt-8 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-center">
        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed" style={{ wordBreak: "keep-all" }}>
          본 서비스는 결제일로부터 1개월 동안 제공되며, 기간 경과 시 서비스 이용 권한이 자동 소진/종료됩니다.
        </p>
      </div>

      {/* [상세 혜택 보기] 팝업 모달 */}
      <PricingDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tierId={selectedTierId}
        onSelectTier={(id) => setSelectedTierId(id)}
        onApply={(id) => handleJoinPayAction(id)}
      />
    </div>
  );
}
