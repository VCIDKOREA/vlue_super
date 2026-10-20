import { useEffect } from "react";
import {
  X,
  CheckCircle,
  Star,
  Sparkles,
  Phone,
  Building2,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  ArrowRight,
  HelpCircle,
  Percent,
  Calendar,
  Layers
} from "lucide-react";
import { VlueBrandMark } from "./VlueBrandLogo.jsx";

/**
 * 4개 요금제별 전체 풀 스펙 및 상세 정책 데이터
 */
export const PRICING_DETAIL_SPECS = {
  free: {
    id: "free",
    name: "일반 회원 (Free)",
    badge: "기본 무료",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    themeColor: "slate",
    price: 0,
    listPrice: null,
    discountRate: null,
    period: "영구 무료",
    headline: "발신자 신원 확인 · 기본 쇼케이스 무료 체험",
    summary:
      "일반 통화 수신 시 발신자 신원을 안전하게 확인하고, 나만의 블루 쇼케이스 1페이지와 BGM 1곡을 무료로 이용할 수 있는 VLUÉ 기본 플랜입니다.",
    coreSpecs: [
      { label: "블루 쇼케이스", value: "1페이지 기본 제공" },
      { label: "디지털 인증명함(DCC)", value: "미제공 (유료 플랜 전용)" },
      { label: "BGM 플레이어", value: "1곡 제공" },
      { label: "케이스함 & 소셜링크", value: "기본 제공" },
      { label: "가족보호 시스템", value: "보호자 등록 시 상속" },
      { label: "본인확인 (PASS)", value: "필수" }
    ],
    fullBullets: [
      "일반 통화 시 수신 화면에서 발신자 신원 확인 및 스팸/사기 제보 데이터를 실시간으로 확인합니다.",
      "블루 쇼케이스 1페이지 · BGM 1곡 · 케이스함·소셜링크 연동 기능이 무료로 기본 제공됩니다.",
      "비즈니스 링크 및 디지털인증명함(DCC)은 정식 유료 구독 플랜에서만 발급 및 송출이 가능합니다.",
      "유료 보호자가 가족플랜으로 등록해줄 경우, 쇼케이스 5페이지·BGM 풀 등 유료 쇼케이스 기능을 무료로 이용할 수 있습니다. (단, 본인 명의 DCC는 상속 제외)",
      "PASS 휴대폰 본인인증 가입을 통해 안전하고 신뢰할 수 있는 소통 기반을 제공합니다."
    ],
    eventConditions: {
      title: "가입 및 이용 안내",
      items: [
        "별도 결제 비용 없이 영구 무료로 이용하실 수 있습니다.",
        "앱 설치 및 휴대폰 본인인증 완료 시 즉시 기본 혜택이 적용됩니다.",
        "언제든지 유료 플랜으로 업그레이드하여 디지털 인증명함 및 가족 4인 보호 시스템을 활성화할 수 있습니다."
      ]
    },
    familyProtection: {
      title: "가족보호 시스템 적용 정책",
      desc: "단독 무료 회원은 가족을 등록할 수 없으나, 유료 회원의 보호자 계정에서 가족으로 등록되면 쇼케이스 5페이지 및 BGM 풀 플레이어 혜택을 상속받아 이용할 수 있습니다."
    },
    billingPolicy: {
      title: "결제 주기 및 청약철회/환불 규정",
      desc: "일반 회원 플랜은 결제 및 청구 금액이 일체 발생하지 않습니다. 유료 전환 결제 시에는 유료 회원 환불 규정이 적용됩니다."
    },
    ctaText: "앱에서 무료로 시작하기"
  },

  paid: {
    id: "paid",
    name: "유료 회원 (Paid)",
    badge: "BEST · 초특가 50%",
    badgeColor: "bg-blue-600 text-white shadow-xs",
    themeColor: "blue",
    price: 14100,
    listPrice: 28300,
    discountRate: "50% 할인",
    period: "월",
    headline: "디지털 인증명함 · 풀 쇼케이스 · 가족보호 시스템",
    summary:
      "사칭 방지 디지털 인증명함(DCC)과 최대 5페이지의 블루 쇼케이스, 온가족 4인 안심 보호 시스템까지 VLUÉ의 모든 핵심 프리미엄 기능을 제공하는 대표 요금제입니다.",
    coreSpecs: [
      { label: "블루 쇼케이스", value: "최대 5페이지 풀 송출" },
      { label: "디지털 인증명함(DCC)", value: "공식 LIVE 인증명함 제공" },
      { label: "BGM 플레이어", value: "풀 플레이어 지원" },
      { label: "비즈니스 링크", value: "페이지당 무제한 연동" },
      { label: "가족보호 시스템", value: "본인 포함 최대 4인 (2계정 8인)" },
      { label: "쇼케이스 커스텀", value: "테마·스타일 전체 지원" }
    ],
    fullBullets: [
      "통화 수신 화면에서 발신자 신원 확인 + 디지털 인증명함(DCC) 및 5페이지 풀 쇼케이스 배너가 실시간 송출됩니다.",
      "쇼케이스 스타일 커스텀, 비즈니스 링크, 소셜 링크, 상담 메뉴 등 모든 유료 설정을 제약 없이 이용합니다.",
      "가족보호시스템(1:3): 유료 개인 계정 1개당 최대 4인(본인+가족 3명), 유료 2계정 시 최대 8인까지 안심 등록할 수 있습니다.",
      "통화 상대방 화면에 공인된 디지털 인증명함과 사칭 주의 보안 경고문구가 함께 표시되어 사칭 및 보이스피싱을 원천 차단합니다.",
      "통화 종료 후에도 명함 저장 및 쇼케이스 아카이빙을 통해 지속적인 비즈니스 네트워킹을 이어갑니다."
    ],
    eventConditions: {
      title: "할인 프로모션 및 특별 조건",
      items: [
        "모바일 런칭 이벤트: 정가 월 28,300원 → 모바일 특가 월 14,100원 (50% 즉시 할인 적용)",
        "최초 가입 + 추천인 코드 할인: 본인인증(CI) 기준 최초 1회 신규 가입 시 추천인 코드 입력 시 월 9,900원 특가 적용",
        "내선·대표번호 추가: 대표자 기본 플랜 결제 후 회선당 월 5,200원에 추가 발급 가능 (추천인 할인 제외)",
        "멀티 프로필+ 옵션: 기본 1개 외 추가 프로필 슬롯당 월 +3,300원 (각 프로필별 독립 DCC·쇼케이스·BGM 운영)"
      ]
    },
    familyProtection: {
      title: "가족보호 시스템 (1:3 가족 플랜)",
      desc: "유료 회원 1계정당 보호자 본인 포함 최대 4인(가족 3인) 등록 가능. 유료 2계정 등록 시 최대 8인까지 통합 관리됩니다. 등록된 가족 구성원에게는 쇼케이스 5페이지 및 BGM 풀 플레이어 상속 혜택이 주어집니다."
    },
    billingPolicy: {
      title: "결제 주기 및 취소·환불 규정",
      desc: "월간 결제(1개월 단위) 상품입니다. 본 서비스는 결제일로부터 1개월 동안 제공되며, 기간 경과 시 서비스 이용 권한이 자동 소진/종료됩니다. 결제 후 7일 이내에 서비스를 전혀 이용하지 않은 경우 전액 환불(청약철회)이 가능합니다. 서비스 이용 이력이 있는 경우 당월 결제 주기 말일까지 서비스가 유지된 후 다음 결제일부터 청구가 중단(해지 예약)됩니다."
    },
    ctaText: "앱에서 가입·결제하기"
  },

  extension_line: {
    id: "extension_line",
    name: "내선·대표번호 추가 (Extension Line)",
    badge: "회선 확장 · 37% 할인",
    badgeColor: "bg-violet-100 text-violet-700 border-violet-200",
    themeColor: "purple",
    price: 5200,
    listPrice: 14100,
    discountRate: "63% 할인",
    period: "회선/월",
    headline: "사업장 유선·대표번호와 직통 휴대폰 연동",
    summary:
      "일반 유선 대표번호(02, 031, 1588 등)나 사업장 내선 번호로 전화를 걸거나 받을 때도 VLUÉ 디지털 인증명함과 쇼케이스를 동일하게 송출할 수 있는 회선 확장 플랜입니다.",
    coreSpecs: [
      { label: "연동 대상", value: "02/031 등 유선, 1588 대표번호, 내선" },
      { label: "쇼케이스 연동", value: "대표자 모바일과 동일하게 송출" },
      { label: "발신자 일치", value: "실시간 기업 브랜딩 일치" },
      { label: "추가 가능 수", value: "무제한 회선 추가 가능" },
      { label: "청구 방식", value: "대표자 계정에 합산 청구" },
      { label: "추천인 할인", value: "적용 불가 (고정 할인가)" }
    ],
    fullBullets: [
      "대표자 모바일 기본 플랜 결제 후 사업장 회선에 대해 개별 추가 발급할 수 있습니다.",
      "휴대폰뿐 아니라 유선 대표번호 발신 시에도 수신자에게 기업 신원과 쇼케이스가 완벽하게 일치되어 표시됩니다.",
      "회사 대표번호로 걸려오는 전화의 스팸/보이스피싱 사칭 오인을 방지하고 브랜드 신뢰도를 극대화합니다.",
      "직원별 내선번호마다 담당 부서 및 직통 정보를 연동하여 체계적인 고객 응대를 지원합니다.",
      "필요한 회선 수만큼 자유롭게 추가하거나 제외할 수 있습니다."
    ],
    eventConditions: {
      title: "추가 발급 조건 및 요금 안내",
      items: [
        "대표자 모바일 기본 플랜(월 28,300원 정가 경로) 결제 후 추가 발급 가능합니다.",
        "정가 14,100원 대비 상시 할인가 개당 월 5,200원(부가세 포함) 고정 적용됩니다.",
        "※ 내선·대표번호 추가 요금은 추천인 할인(4,200원)이 중복 적용되지 않습니다.",
        "대표자 모바일 기본 플랜 결제 계정이 유지되는 동안 연동 이용하실 수 있습니다."
      ]
    },
    familyProtection: {
      title: "가족보호 시스템 적용 정책",
      desc: "내선 및 대표번호 회선은 사업장 업무 전용 회선으로 가족보호 시스템 등록 대상에 해당하지 않습니다."
    },
    billingPolicy: {
      title: "결제 주기 및 청약철회/환불 규정",
      desc: "대표자 계정 결제 주기에 합산 청구되며, 회선 삭제/해지 시 당월 잔여 일수에 대해 일할 계산 정산되거나 익월 청구에서 제외 처리됩니다."
    },
    ctaText: "회선 추가 신청하기"
  },

  b2b: {
    id: "b2b",
    name: "B2B 풀 패키지 (Business)",
    badge: "기업 전용 · 임직원 특가",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    themeColor: "gold",
    price: 14100,
    listPrice: 28300,
    discountRate: "임직원 50% 할인",
    period: "모바일 회선/월",
    headline: "기업 CI/BI 연동 · 임직원 일괄 인증 · 단체 관리",
    summary:
      "기업 공식 CI/BI 로고 및 대표번호를 전사 임직원에게 연동하고, 관리자 콘솔을 통해 일괄 라이선스 배포 및 회선 관리가 가능한 B2B 엔터프라이즈 솔루션입니다.",
    coreSpecs: [
      { label: "디지털 인증명함", value: "기업 CI/BI 워터마크 & 대표번호 연동" },
      { label: "임직원 쇼케이스", value: "전 임직원 5페이지 풀 쇼케이스 제공" },
      { label: "조직 관리 콘솔", value: "부서/직급/회선 일괄 라이선스 관리" },
      { label: "세금계산서", value: "법인 결제 및 전자세금계산서 100% 지원" },
      { label: "대표자 계정", value: "월 99,000원 (통합 관리자)" },
      { label: "임직원 회선", value: "월 14,100원 (추천인 9,900원)" }
    ],
    fullBullets: [
      "대표자 관리자 계정 월 99,000원 + 임직원 모바일 회선당 월 14,100원(추천인 시 9,900원) 구조입니다.",
      "유료 회원과 동일한 최상위 블루 쇼케이스(5페이지)와 디지털 인증명함을 임직원 전원에게 회선 단위로 제공합니다.",
      "기업 CI/BI, 공식 로고, 회사 대표번호가 명함 중앙에 공인 워터마크로 노출되어 대외 공신력을 극대화합니다.",
      "관리자 콘솔을 통해 직원 입사/퇴사 시 명함 회선 즉시 회수 및 재배치가 가능합니다.",
      "내선·대표번호 추가는 개당 월 5,200원(추천인 할인 제외)으로 무제한 연동 가능합니다."
    ],
    eventConditions: {
      title: "B2B 도입 혜택 및 요금 구성",
      items: [
        "임직원 모바일 회선 특가: 정가 28,300원 → B2B 특별 할인가 월 14,100원 (50% 할인)",
        "추천인 코드 적용 시: 최초 가입 임직원 회선당 월 9,900원 우대 요금 적용",
        "내선·대표번호 추가: 개당 월 5,200원 (대표번호/내선번호 무제한 추가)",
        "멀티 프로필+ : 추가 프로필당 월 +3,300원",
        "대량 회선(20회선 이상) 도입 시 전담 매니저 배정 및 볼륨 디스카운트 상담 지원"
      ]
    },
    familyProtection: {
      title: "가족보호 시스템 적용 정책",
      desc: "기업 회선은 업무 전용으로 운영되므로 가족보호 시스템은 기업 계정에 해당하지 않습니다. 임직원 개인의 가족보호는 별도 개인(유료) 계정으로 이용하실 수 있습니다."
    },
    billingPolicy: {
      title: "결제 주기 및 취소·환불 규정",
      desc: "본 서비스는 결제일로부터 1개월 동안 제공되며, 기간 경과 시 서비스 이용 권한이 자동 소진/종료됩니다. 법인 카드 정기 결제 또는 세금계산서 기반 월간 계약이 가능합니다. 중도 회선 추가/감소 시 일할 계산 정산이 적용되며, 계약 해지는 B2B 서비스 계약서 및 관련 약관의 해지 규정에 따릅니다."
    },
    ctaText: "B2B 상담·가입하기"
  }
};

/**
 * [상세 혜택 보기] 팝업 모달 컴포넌트
 */
export default function PricingDetailModal({
  isOpen,
  onClose,
  tierId = "paid",
  onSelectTier,
  onApply
}) {
  const currentTierId = tierId in PRICING_DETAIL_SPECS ? tierId : "paid";
  const plan = PRICING_DETAIL_SPECS[currentTierId];

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 바디 스크롤 방지
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  const handleApplyClick = () => {
    onClose?.();
    onApply?.(plan.id);
  };

  const isFree = plan.id === "free";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden animate-fade-in">
        {/* 상단 헤더 영역 */}
        <div className="relative border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
                <span className="text-xs font-semibold text-slate-500">요금제 상세 스펙 안내</span>
              </div>
              <h2 id="pricing-modal-title" className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {plan.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1" style={{ wordBreak: "keep-all" }}>
                {plan.headline}
              </p>
            </div>

            {/* 우측 상단 닫기 [X] 버튼 */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition active:scale-95"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 4개 요금제 간편 전환 탭 */}
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-200/60 pt-3">
            {Object.keys(PRICING_DETAIL_SPECS).map((k) => {
              const item = PRICING_DETAIL_SPECS[k];
              const isSelected = item.id === plan.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTier?.(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.name.split(" ")[0]}
                </button>
              );
            })}
          </div>

          {/* 가격 요약 배너 */}
          <div className="mt-3.5 flex flex-wrap items-baseline gap-2 rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-xs">
            {plan.listPrice ? (
              <span className="text-xs font-semibold text-slate-400 line-through">
                정가 {plan.listPrice.toLocaleString("ko-KR")}원
              </span>
            ) : null}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-inter tracking-tight text-slate-900">
                {isFree ? "무료" : `${plan.price.toLocaleString("ko-KR")}원`}
              </span>
              <span className="text-xs font-bold text-slate-500">/{plan.period}</span>
            </div>
            {plan.discountRate ? (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-rose-50 text-rose-600 border border-rose-100">
                {plan.discountRate}
              </span>
            ) : null}
          </div>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 space-y-6 text-slate-800">
          {/* 1. 요약 소개 */}
          <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 text-xs sm:text-sm leading-relaxed text-blue-950" style={{ wordBreak: "keep-all" }}>
            <p className="font-semibold">{plan.summary}</p>
          </div>

          {/* 2. 핵심 사양 매트릭스 */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              <Layers className="w-3.5 h-3.5 text-primary-600" />
              핵심 스펙 요약
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {plan.coreSpecs.map((spec) => (
                <div key={spec.label} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5">
                  <span className="block text-[11px] font-medium text-slate-500">{spec.label}</span>
                  <span className="block text-xs font-bold text-slate-900 mt-0.5 truncate">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 풀 스펙 상세 제공 내역 */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              전체 제공 상세 혜택
            </h3>
            <ul className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-4">
              {plan.fullBullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-slate-700">
                  <CheckCircle className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                  <span style={{ wordBreak: "keep-all" }}>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. 할인 프로모션 및 특별 조건 */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              {plan.eventConditions.title}
            </h3>
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 space-y-2">
              {plan.eventConditions.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed text-amber-950">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <span style={{ wordBreak: "keep-all" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. 가족보호 시스템 정책 */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              {plan.familyProtection.title}
            </h3>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:text-[13px] leading-relaxed text-slate-700" style={{ wordBreak: "keep-all" }}>
              {plan.familyProtection.desc}
            </div>
          </div>

          {/* 6. 결제 주기 및 청약철회/환불 규정 */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              {plan.billingPolicy.title}
            </h3>
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 text-xs sm:text-[12.5px] leading-relaxed text-slate-600 space-y-2" style={{ wordBreak: "keep-all" }}>
              <p>{plan.billingPolicy.desc}</p>
              <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-primary-700">
                <a href="#terms" onClick={onClose} className="hover:underline">이용약관 안내 &gt;</a>
                <a href="#privacy" onClick={onClose} className="hover:underline">개인정보처리방침 &gt;</a>
                <a href="#refund" onClick={onClose} className="hover:underline">환불·청약철회 규정 &gt;</a>
              </div>
            </div>
          </div>

          {/* 서비스 제공기간 및 소진 규정 안내 (NHN KCP PG 심사 필수) */}
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 text-center">
            <p className="text-xs sm:text-[13px] font-semibold text-blue-900 leading-relaxed" style={{ wordBreak: "keep-all" }}>
              본 서비스는 결제일로부터 1개월 동안 제공되며, 기간 경과 시 서비스 이용 권한이 자동 소진/종료됩니다.
            </p>
          </div>
        </div>

        {/* 하단 푸터 CTA 버튼 영역 */}
        <div className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8 sm:py-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
          >
            닫기
          </button>

          <button
            type="button"
            onClick={handleApplyClick}
            className={`flex-1 sm:flex-initial sm:min-w-[220px] py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-white transition flex items-center justify-center gap-2 shadow-md active:scale-98 ${
              plan.id === "b2b"
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20"
                : plan.id === "extension_line"
                ? "bg-violet-600 hover:bg-violet-700 shadow-violet-500/20"
                : plan.id === "free"
                ? "bg-slate-800 hover:bg-slate-900"
                : "bg-primary-600 hover:bg-primary-700 shadow-primary-500/25"
            }`}
          >
            <span>{plan.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
