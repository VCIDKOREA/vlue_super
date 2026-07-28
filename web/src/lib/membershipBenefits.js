import {
  formatKrw,
  PAID_EVENT_MONTHLY_KRW,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_LAUNCH_DISCOUNT_NOTE,
  PAID_ANNUAL_BENEFIT_NOTE,
  B2B_REP_LIST_MONTHLY_KRW,
  B2B_STAFF_LIST_MONTHLY_KRW,
  B2B_STAFF_EVENT_MONTHLY_KRW,
  B2B_EVENT_NOTE,
  SOHO_BROADCAST_MONTHLY_KRW,
  SOHO_BROADCAST_NO_DISCOUNT_NOTE
} from "./membershipBm.js";

/** 유료 전용 — 가족보호 1:3 (유료 1계정=4인, 2계정=8인) */
export const FAMILY_PROTECTION_SUMMARY_SHORT = "유료 1계정 4인 · 2계정 8인";
export const FAMILY_PROTECTION_SUMMARY =
  "가족보호시스템(1:3): 유료 개인 계정 1개당 최대 4인(유료회원+가족 3명), 유료 2계정 시 최대 8인까지 등록. 초과 인원 추가 요금.";
export const FAMILY_PROTECTION_B2B_NOTE =
  "기업 회선은 업무 전용입니다. 가족보호는 기업 계정에 해당하지 않으며, 별도 개인(유료) 계정으로 이용할 수 있습니다.";

/** @deprecated V1 미운영 */
export const VLUER_REFERRAL_B2B_NOTE = "V1에서는 추천인·리워드 프로그램을 운영하지 않습니다.";

/** 기업(B2B) — V1 풀 패키지 */
export const B2B_ENTERPRISE_SUMMARY_SHORT = `대표 ${formatKrw(B2B_REP_LIST_MONTHLY_KRW)} + 직원 ${formatKrw(B2B_STAFF_EVENT_MONTHLY_KRW)}(${B2B_EVENT_NOTE})`;
export const B2B_ENTERPRISE_SUMMARY =
  `비즈니스 / B2B 풀 패키지: 대표자 계정 ${formatKrw(B2B_REP_LIST_MONTHLY_KRW)} + 직원 회선 정가 ${formatKrw(B2B_STAFF_LIST_MONTHLY_KRW)} → 이벤트 ${formatKrw(B2B_STAFF_EVENT_MONTHLY_KRW)}(${B2B_EVENT_NOTE}). 유료와 동일한 블루 쇼케이스·디지털 인증명함(회선 단위). 가족보호는 개인 유료 계정에서만 이용.`;

/** V1 가입 멤버십 — 혜택 비교 (쇼케이스·가족보호 중심) */
export const MEMBERSHIP_BENEFIT_ROWS = [
  {
    label: "통화·신원 확인",
    free: "제공",
    paid: "제공",
    b2b: "제공"
  },
  {
    label: "블루 쇼케이스",
    free: "기본(연락처별)",
    paid: "풀(명함+배너)",
    b2b: "풀(회선)"
  },
  {
    label: "디지털 인증명함",
    free: "—",
    paid: "제공",
    b2b: "CI·대표번호"
  },
  {
    label: "쇼케이스 스타일 설정",
    free: "기본",
    paid: "전체",
    b2b: "전체"
  },
  {
    label: "PASS·본인확인",
    free: "필수",
    paid: "필수",
    b2b: "필수"
  },
  {
    label: "가족보호",
    free: "—",
    paid: "1:3",
    b2b: "해당 없음"
  },
  {
    label: "추가번호 쇼케이스 송출",
    free: "—",
    paid: `옵션 +${SOHO_BROADCAST_MONTHLY_KRW.toLocaleString("ko-KR")}`,
    b2b: "대표 외 추가번호"
  },
  {
    label: "구독 요금",
    free: "무료",
    paid: `월 ${formatKrw(PAID_EVENT_MONTHLY_KRW)}`,
    b2b: `직원 ${formatKrw(B2B_STAFF_EVENT_MONTHLY_KRW)}`
  }
];

export const MEMBERSHIP_PLAN_DETAILS = {
  free: {
    id: "free",
    title: "일반 회원 (Free)",
    badge: "무료",
    accent: "slate",
    headline: "통화 신원 확인 · 기본 쇼케이스",
    bullets: [
      "일반 통화 시 수신 화면에서 발신자 신원 확인 서비스를 이용합니다.",
      "무료 티어 블루 쇼케이스: 등록 연락처는 맞춤 프로필, 미등록은 안전 VLUE 표시로 안내합니다.",
      "PASS·휴대폰 본인확인으로 안전한 이용 기반을 만듭니다."
    ]
  },
  paid: {
    id: "paid",
    title: "유료 회원 (Paid)",
    badge: "구독",
    accent: "blue",
    headline: "디지털 인증명함 · 풀 쇼케이스 · 가족보호",
    bullets: [
      "수신 화면 발신자 신원 확인 + 디지털 인증명함·쇼케이스 배너(최대 5) 풀 송출을 제공합니다.",
      "쇼케이스 스타일·소셜 링크·메뉴 등 유료 설정을 이용합니다.",
      FAMILY_PROTECTION_SUMMARY,
      `정가 월 ${formatKrw(PAID_LIST_PRICE_MONTHLY_KRW)} → 판매가 월 ${formatKrw(PAID_EVENT_MONTHLY_KRW)}. ${PAID_LAUNCH_DISCOUNT_NOTE}`,
      PAID_ANNUAL_BENEFIT_NOTE,
      `SOHO 영업 송출 옵션: 대표자 계정 외 추가번호 쇼케이스만 +월 ${SOHO_BROADCAST_MONTHLY_KRW.toLocaleString("ko-KR")}원(${SOHO_BROADCAST_NO_DISCOUNT_NOTE}).`
    ]
  },
  b2b: {
    id: "b2b",
    title: "비즈니스 / B2B 풀 패키지",
    badge: "기업",
    accent: "indigo",
    headline: "회선 단위 쇼케이스 · 직원 이벤트 요금",
    bullets: [
      B2B_ENTERPRISE_SUMMARY,
      "유료와 동일한 블루 쇼케이스·디지털 인증명함을 회선 단위로 제공합니다.",
      "기업 CI/BI·회사 대표번호 연동 디지털 인증명함을 지원합니다.",
      FAMILY_PROTECTION_B2B_NOTE,
      `SOHO 영업 송출 옵션: 대표자 외 추가번호 쇼케이스만 +월 ${SOHO_BROADCAST_MONTHLY_KRW.toLocaleString("ko-KR")}원(${SOHO_BROADCAST_NO_DISCOUNT_NOTE}).`
    ]
  }
};
