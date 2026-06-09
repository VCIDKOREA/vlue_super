/**
 * 앱 멤버십 BM(membershipBm · membershipBenefits)과 동일한 무료 / 유료 / 기업(B2B) 요금제
 */
import {
  MEMBERSHIP_BENEFIT_ROWS,
  MEMBERSHIP_PLAN_DETAILS,
  FAMILY_PROTECTION_SUMMARY_SHORT,
  B2B_ENTERPRISE_SUMMARY_SHORT,
  VLUER_REFERRAL_B2B_NOTE,
} from '../../../lib/membershipBenefits.js';
import {
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_MONTHLY_DISCOUNTED_KRW,
  PAID_LIST_PRICE_ANNUAL_KRW,
  PAID_ANNUAL_DISCOUNTED_KRW,
  PAID_MONTHLY_SLIDING_DISCOUNTED_KRW,
  REFERRAL_BENEFIT_PROMO_MONTHS,
  PAID_MEMBERSHIP_SUBLINE,
  B2B_MEMBERSHIP_SUBLINE,
  REFERRAL_PROGRAM_NOTICES,
  PERSONAL_COMBO_PRICING_NOTE,
  broadcastAddonAmountKrw,
  sohoActivityPlanDescription,
  sohoBroadcastPlanDescription,
  b2bPlanDescription,
} from '../../../lib/membershipBm.js';
import { pricingNumbers } from '../../../lib/pricingConfig.js';
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
    period: '무료',
    description: MEMBERSHIP_PLAN_DETAILS.free.headline,
    color: 'gray' as const,
    features: MEMBERSHIP_PLAN_DETAILS.free.bullets,
  },
  {
    id: 'paid',
    name: '유료 회원',
    price: PAID_MONTHLY_DISCOUNTED_KRW,
    period: '월 (추천인 할인)',
    description: `${MEMBERSHIP_PLAN_DETAILS.paid.headline} · ${PAID_MEMBERSHIP_SUBLINE}`,
    color: 'blue' as const,
    recommended: true,
    features: MEMBERSHIP_PLAN_DETAILS.paid.bullets,
    priceNote: `정가 월 ${PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString('ko-KR')}원 · 연 ${PAID_ANNUAL_DISCOUNTED_KRW.toLocaleString('ko-KR')}원(2개월 무료)`,
  },
  {
    id: 'b2b',
    name: 'B2B 풀 패키지',
    price: pricingNumbers().b2bMonthly,
    period: '회선/월 (PC 전용)',
    description: b2bPlanDescription(),
    color: 'gold' as const,
    features: MEMBERSHIP_PLAN_DETAILS.b2b.bullets,
    priceNote: B2B_ENTERPRISE_SUMMARY_SHORT,
  },
  {
    id: 'soho_broadcast',
    name: 'SOHO 영업 송출 옵션',
    price: broadcastAddonAmountKrw('monthly'),
    period: '추가/월',
    description: sohoBroadcastPlanDescription(),
    color: 'purple' as const,
    features: [
      'Primary(SOHO 활동형) 필요',
      '발신번호 등록·인증',
      '수신 화면 디지털인증명함 송출(Secondary)',
      '기본 명함과 별도 번호·송출 효과',
    ],
    priceNote: `SOHO 활동형 ${pricingNumbers().sohoMonthly.toLocaleString('ko-KR')}원과 별도 SKU`,
  },
];

export const VLUER_REFERRAL_GRADES = [
  { title: '일반 VLUER', desc: '구독 5% 포인트 · 쇼핑 쉐어 없음' },
  { title: '인증 VLUER', desc: '구독 10% 캐시 · 쇼핑 0.3% 쉐어' },
  { title: '파트너 VLUER', desc: '구독 15% 캐시 · 쇼핑 0.8% 쉐어' },
  { title: '공식 VLUER', desc: 'B2B 제휴 전용' },
] as const;

/** 서비스소개 — 요금제 아코디언 (앱 설정 문구) */
export const MEMBERSHIP_PRICING_FEATURES: ServiceAccordionItem[] = [
  {
    id: 'plan-free',
    title: '일반 회원 (Free) — 무료',
    summary: MEMBERSHIP_PLAN_DETAILS.free.headline,
    detail: MEMBERSHIP_PLAN_DETAILS.free.bullets,
  },
  {
    id: 'plan-soho',
    title: 'SOHO 활동형 (Primary)',
    summary: sohoActivityPlanDescription(),
    detail: [
      ...MEMBERSHIP_PLAN_DETAILS.paid.bullets,
      '채팅·쇼핑 등 핵심 기능 접근 기준',
      `월 ${pricingNumbers().sohoMonthly.toLocaleString('ko-KR')}원(부가세 포함, 추천인 할인 시)`,
    ],
  },
  {
    id: 'plan-broadcast',
    title: 'SOHO 영업 송출 옵션 (Secondary)',
    summary: sohoBroadcastPlanDescription(),
    detail: [
      'Primary 계정 + 월 4,200원(설정값) 추가',
      '등록·인증된 발신번호로 발신 시 수신 화면에 디지털인증명함 송출',
      'VLUER 포인트·임직원 콤보와 별개 SKU',
    ],
  },
  {
    id: 'plan-paid',
    title: '유료 회원 (Paid) — 구독',
    summary: `${MEMBERSHIP_PLAN_DETAILS.paid.headline} · ${PAID_MEMBERSHIP_SUBLINE}`,
    detail: [
      ...MEMBERSHIP_PLAN_DETAILS.paid.bullets,
      `가족보호: ${FAMILY_PROTECTION_SUMMARY_SHORT}`,
      `추천인 할인: 최초 ${REFERRAL_BENEFIT_PROMO_MONTHS}개월 월 ${PAID_MONTHLY_DISCOUNTED_KRW.toLocaleString('ko-KR')}원(30%) / 연 ${PAID_ANNUAL_DISCOUNTED_KRW.toLocaleString('ko-KR')}원 → 이후 영구 월 ${PAID_MONTHLY_SLIDING_DISCOUNTED_KRW.toLocaleString('ko-KR')}원(15%)`,
    ],
  },
  {
    id: 'plan-b2b',
    title: '기업 단체 회원 (B2B)',
    summary: MEMBERSHIP_PLAN_DETAILS.b2b.headline,
    detail: MEMBERSHIP_PLAN_DETAILS.b2b.bullets,
  },
  {
    id: 'plan-referral',
    title: 'VLUER 추천·리워드 프로그램',
    summary: '12개월 30% → 이후 15% 영구 · 추천인 15%→5% 영구 · 등급별 리워드',
    detail: [
      ...REFERRAL_PROGRAM_NOTICES,
      ...VLUER_REFERRAL_GRADES.map((g) => `${g.title}: ${g.desc}`),
      '※ 위 구독 리워드 %는 추천 가입 회원의 첫 12개월 기준입니다. 13개월째부터 해당 회원 구독 분은 5% 고정(영구) 적립입니다.',
      VLUER_REFERRAL_B2B_NOTE,
      `임직원 콤보: ${PERSONAL_COMBO_PRICING_NOTE}`,
    ],
  },
  {
    id: 'plan-compare',
    title: '무료 · 유료 · 기업 혜택 비교표',
    summary: '통화·명함·가족보호·VLUER·구독 요금 한눈에',
    detail: MEMBERSHIP_BENEFIT_ROWS.map(
      (row) => `${row.label} — 일반: ${row.free} | 유료: ${row.paid} | 기업: ${row.b2b}`,
    ),
  },
];
