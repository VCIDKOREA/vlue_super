/**
 * 웹 마케팅 요금제 — 무료 / 유료(모바일 이벤트·추천인) / 내선·대표번호 / B2B
 */
import {
  MEMBERSHIP_BENEFIT_ROWS,
  MEMBERSHIP_PLAN_DETAILS,
  FAMILY_PROTECTION_SUMMARY_SHORT,
  B2B_ENTERPRISE_SUMMARY_SHORT,
} from '../../../lib/membershipBenefits.js';
import {
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_EVENT_MONTHLY_KRW,
  PAID_EVENT_ANNUAL_KRW,
  PAID_REFERRAL_MONTHLY_KRW,
  PAID_REFERRAL_ANNUAL_KRW,
  PAID_LAUNCH_DISCOUNT_NOTE,
  PAID_ANNUAL_BENEFIT_NOTE,
  PAID_MEMBERSHIP_SUBLINE,
  B2B_REP_LIST_MONTHLY_KRW,
  B2B_STAFF_LIST_MONTHLY_KRW,
  B2B_STAFF_EVENT_MONTHLY_KRW,
  B2B_EVENT_NOTE,
  EXTENSION_LINE_MONTHLY_KRW,
  EXTENSION_LINE_LIST_MONTHLY_KRW,
  EXTENSION_LINE_NO_REFERRAL_NOTE,
  EXTENSION_LINE_MEMBERSHIP_SUBLINE,
  MULTI_PROFILE_ADDON_MONTHLY_KRW,
  MULTI_PROFILE_ADDON_FEATURES,
  MULTI_PROFILE_ADDON_MEMBERSHIP_SUBLINE,
  b2bPlanDescription,
} from '../../../lib/membershipBm.js';

export type ServiceAccordionItem = {
  id: string;
  title: string;
  summary: string;
  detail: string | string[];
};

export { MEMBERSHIP_BENEFIT_ROWS, MEMBERSHIP_PLAN_DETAILS };

/** 마케팅 PricingPage · mockData용 카드 */
export const MARKETING_PRICING_TIERS = [
  {
    id: 'free',
    name: '일반 회원',
    price: 0,
    listPrice: null as number | null,
    period: '무료',
    description: MEMBERSHIP_PLAN_DETAILS.free.headline,
    color: 'gray' as const,
    features: MEMBERSHIP_PLAN_DETAILS.free.bullets,
  },
  {
    id: 'paid',
    name: '유료 회원',
    price: PAID_EVENT_MONTHLY_KRW,
    listPrice: PAID_LIST_PRICE_MONTHLY_KRW,
    period: '월',
    description: `${MEMBERSHIP_PLAN_DETAILS.paid.headline} · ${PAID_MEMBERSHIP_SUBLINE}`,
    color: 'blue' as const,
    recommended: true,
    features: MEMBERSHIP_PLAN_DETAILS.paid.bullets,
    priceNote: `${PAID_LAUNCH_DISCOUNT_NOTE} / ${PAID_ANNUAL_BENEFIT_NOTE}`,
    promoBadge: '모바일 이벤트',
  },
  {
    id: 'extension_line',
    name: '내선·대표번호 추가',
    price: EXTENSION_LINE_MONTHLY_KRW,
    listPrice: EXTENSION_LINE_LIST_MONTHLY_KRW,
    period: '회선/월',
    description: EXTENSION_LINE_MEMBERSHIP_SUBLINE,
    color: 'purple' as const,
    features: [
      '대표자 모바일 기본 플랜(월 28,300원 정가 경로) 결제 후 추가 발급',
      `개당 월 ${EXTENSION_LINE_MONTHLY_KRW.toLocaleString('ko-KR')}원`,
      EXTENSION_LINE_NO_REFERRAL_NOTE,
      '휴대·대표·내선 회선 쇼케이스·인증명함 연동',
    ],
    priceNote: `정가 ${EXTENSION_LINE_LIST_MONTHLY_KRW.toLocaleString('ko-KR')}원 대비 할인가 · ${EXTENSION_LINE_NO_REFERRAL_NOTE}`,
  },
  {
    id: 'b2b',
    name: 'B2B 풀 패키지',
    price: B2B_STAFF_EVENT_MONTHLY_KRW,
    listPrice: B2B_STAFF_LIST_MONTHLY_KRW,
    period: '직원 회선/월',
    description: b2bPlanDescription(),
    color: 'gold' as const,
    features: MEMBERSHIP_PLAN_DETAILS.b2b.bullets,
    priceNote: `대표자 계정 ${B2B_REP_LIST_MONTHLY_KRW.toLocaleString('ko-KR')}원 + 직원 회선 정가 ${B2B_STAFF_LIST_MONTHLY_KRW.toLocaleString('ko-KR')}원 → 이벤트 ${B2B_STAFF_EVENT_MONTHLY_KRW.toLocaleString('ko-KR')}원(${B2B_EVENT_NOTE}) · ${B2B_ENTERPRISE_SUMMARY_SHORT}`,
    promoBadge: B2B_EVENT_NOTE,
  },
];

/** @deprecated 구 import 호환 */
export const VLUER_REFERRAL_GRADES = [] as const;

/** 서비스소개 — 요금제 아코디언 */
export const MEMBERSHIP_PRICING_FEATURES: ServiceAccordionItem[] = [
  {
    id: 'plan-free',
    title: '일반 회원 (Free) — 무료',
    summary: MEMBERSHIP_PLAN_DETAILS.free.headline,
    detail: MEMBERSHIP_PLAN_DETAILS.free.bullets,
  },
  {
    id: 'plan-paid',
    title: '유료 회원 (Paid) — 구독',
    summary: `${MEMBERSHIP_PLAN_DETAILS.paid.headline} · ${PAID_MEMBERSHIP_SUBLINE}`,
    detail: [
      ...MEMBERSHIP_PLAN_DETAILS.paid.bullets,
      `가족보호: ${FAMILY_PROTECTION_SUMMARY_SHORT}`,
      `연간 구독: 이벤트 ${PAID_EVENT_ANNUAL_KRW.toLocaleString('ko-KR')}원 · 추천인 ${PAID_REFERRAL_ANNUAL_KRW.toLocaleString('ko-KR')}원 · ${PAID_ANNUAL_BENEFIT_NOTE}`,
      `최초 가입+추천인 코드: 월 ${PAID_REFERRAL_MONTHLY_KRW.toLocaleString('ko-KR')}원(본인인증 CI 기준 1회)`,
    ],
  },
  {
    id: 'plan-extension',
    title: '내선·대표번호 추가',
    summary: EXTENSION_LINE_MEMBERSHIP_SUBLINE,
    detail: [
      '대표자 모바일 기본 플랜 결제 상태에서만 추가 발급 가능',
      `개당 월 ${EXTENSION_LINE_MONTHLY_KRW.toLocaleString('ko-KR')}원(정가 ${EXTENSION_LINE_LIST_MONTHLY_KRW.toLocaleString('ko-KR')}원 대비)`,
      EXTENSION_LINE_NO_REFERRAL_NOTE,
    ],
  },
  {
    id: 'plan-b2b',
    title: '비즈니스 / B2B 풀 패키지',
    summary: MEMBERSHIP_PLAN_DETAILS.b2b.headline,
    detail: MEMBERSHIP_PLAN_DETAILS.b2b.bullets,
  },
  {
    id: 'plan-multi-profile',
    title: '멀티 프로필+',
    summary: MULTI_PROFILE_ADDON_MEMBERSHIP_SUBLINE,
    detail: [
      ...MULTI_PROFILE_ADDON_FEATURES,
      '유료 본 구독(DCC 발급)과 별도 — 슬롯만 추가 결제',
    ],
  },
  {
    id: 'plan-compare',
    title: '무료 · 유료 · 기업 혜택 비교표',
    summary: '통화·쇼케이스·가족보호·구독 요금 한눈에',
    detail: MEMBERSHIP_BENEFIT_ROWS.map(
      (row) => `${row.label} — 일반: ${row.free} | 유료: ${row.paid} | 기업: ${row.b2b}`,
    ),
  },
];
