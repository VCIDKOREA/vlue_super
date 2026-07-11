/**
 * 앱 멤버십 BM(membershipBm · membershipBenefits)과 동일한 무료 / 유료 / 기업(B2B) 요금제 — V1
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
  PAID_LAUNCH_DISCOUNT_NOTE,
  PAID_ANNUAL_BENEFIT_NOTE,
  PAID_MEMBERSHIP_SUBLINE,
  B2B_REP_LIST_MONTHLY_KRW,
  B2B_STAFF_LIST_MONTHLY_KRW,
  B2B_STAFF_EVENT_MONTHLY_KRW,
  B2B_EVENT_NOTE,
  SOHO_BROADCAST_MONTHLY_KRW,
  SOHO_BROADCAST_NO_DISCOUNT_NOTE,
  broadcastAddonAmountKrw,
  sohoBroadcastPlanDescription,
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
    promoBadge: 'V1 65% 할인',
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
  {
    id: 'soho_broadcast',
    name: 'SOHO 영업 송출 옵션',
    price: broadcastAddonAmountKrw('monthly'),
    listPrice: null as number | null,
    period: '추가/월',
    description: sohoBroadcastPlanDescription(),
    color: 'purple' as const,
    features: [
      '대표자 계정 외 추가번호에만 적용',
      '쇼케이스만 제공되는 기능',
      `월 +${SOHO_BROADCAST_MONTHLY_KRW.toLocaleString('ko-KR')}원(${SOHO_BROADCAST_NO_DISCOUNT_NOTE})`,
      '유료·B2B 본 요금과 별도 SKU',
    ],
    priceNote: `할인 미적용 · 월 ${SOHO_BROADCAST_MONTHLY_KRW.toLocaleString('ko-KR')}원 고정`,
  },
];

/** @deprecated V1 미운영 — 빈 배열 유지(구 import 호환) */
export const VLUER_REFERRAL_GRADES = [] as const;

/** 서비스소개 — 요금제 아코디언 (V1) */
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
      `연간 구독: ${PAID_EVENT_ANNUAL_KRW.toLocaleString('ko-KR')}원 · ${PAID_ANNUAL_BENEFIT_NOTE}`,
    ],
  },
  {
    id: 'plan-b2b',
    title: '비즈니스 / B2B 풀 패키지',
    summary: MEMBERSHIP_PLAN_DETAILS.b2b.headline,
    detail: MEMBERSHIP_PLAN_DETAILS.b2b.bullets,
  },
  {
    id: 'plan-broadcast',
    title: 'SOHO 영업 송출 옵션',
    summary: sohoBroadcastPlanDescription(),
    detail: [
      '대표자 계정 외 추가번호 쇼케이스만 제공',
      `월 +${SOHO_BROADCAST_MONTHLY_KRW.toLocaleString('ko-KR')}원(${SOHO_BROADCAST_NO_DISCOUNT_NOTE})`,
      '유료·B2B 출시 할인과 별개 — 할인 미적용',
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
