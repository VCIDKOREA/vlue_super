import {
  formatKrw,
  PAID_ANNUAL_DISCOUNTED_KRW,
  PAID_LIST_PRICE_ANNUAL_KRW,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_MONTHLY_DISCOUNTED_KRW
} from "./membershipBm.js";
import {
  GROUP_ANNUAL_PER_LINE_KRW,
  GROUP_MONTHLY_PER_LINE_KRW,
  GROUP_SIGNUP_MIN_LINES
} from "./groupSignupBm.js";

/** 유료 전용 — 가족보호 1:3 (유료 1계정=4인, 2계정=8인) */
export const FAMILY_PROTECTION_SUMMARY_SHORT = "유료 1계정 4인 · 2계정 8인";
export const FAMILY_PROTECTION_SUMMARY =
  "가족보호시스템(1:3): 유료 개인 계정 1개당 최대 4인(유료회원+가족 3명), 유료 2계정 시 최대 8인까지 등록. 초과 인원 추가 요금.";
export const FAMILY_PROTECTION_B2B_NOTE =
  "기업 회선은 업무 전용입니다. 가족보호는 기업 계정에 해당하지 않으며, 별도 개인(유료) 계정으로 이용할 수 있습니다.";
export const VLUER_REFERRAL_B2B_NOTE =
  "VLUER 추천 프로그램은 개인 회원(일반·유료) 전용입니다. 기업 회선에는 해당하지 않습니다.";

/** 기업(B2B) 전용 — 10회선 이상 단체 특가 */
export const B2B_ENTERPRISE_SUMMARY_SHORT = `${GROUP_SIGNUP_MIN_LINES}회선↑ · 대표 ${formatKrw(PAID_LIST_PRICE_MONTHLY_KRW)} · 하부 ${formatKrw(GROUP_MONTHLY_PER_LINE_KRW)}/월`;
export const B2B_ENTERPRISE_SUMMARY =
  `기업 단체(B2B): ${GROUP_SIGNUP_MIN_LINES}회선 이상. 추천인 없을 때 대표(VLUE) ${formatKrw(PAID_LIST_PRICE_MONTHLY_KRW)}/월 · 직원 회선 ${formatKrw(GROUP_MONTHLY_PER_LINE_KRW)}/월. 추천인 있으면 전 회선 단체 요금(${formatKrw(GROUP_MONTHLY_PER_LINE_KRW)}/월). 유료 혜택 포함 + 사내 그룹 채팅·비품 구매·기기 승인·회선·역할 관리.`;

/** 가입 멤버십 선택 — 혜택·서비스 비교 (UI용, 짧은 문구) */
export const MEMBERSHIP_BENEFIT_ROWS = [
  {
    label: "통화·신원 확인",
    free: "제공",
    paid: "제공",
    b2b: "제공"
  },
  {
    label: "디지털 명함",
    free: "—",
    paid: "인증 명함",
    b2b: "CI 연동"
  },
  {
    label: "서류 양식",
    free: "기본",
    paid: "전체",
    b2b: "전체+세무"
  },
  {
    label: "VLUE PAGE",
    free: "이용",
    paid: "이용",
    b2b: "이용"
  },
  {
    label: "PASS·생체",
    free: "필수",
    paid: "필수",
    b2b: "필수"
  },
  {
    label: "활동 보드",
    free: "이용",
    paid: "이용",
    b2b: "이용"
  },
  {
    label: "VLUER 추천",
    free: "5% 포인트",
    paid: "업그레이드",
    b2b: "해당 없음"
  },
  {
    label: "AI·지역 광고",
    free: "—",
    paid: "제공",
    b2b: "제공"
  },
  {
    label: "가족보호",
    free: "—",
    paid: "1:3",
    b2b: "해당 없음"
  },
  {
    label: "사내 채팅",
    free: "—",
    paid: "—",
    b2b: "자동 개설"
  },
  {
    label: "상품구매",
    free: "VLUE 공급가",
    paid: "VLUE 공급가",
    b2b: "기업할인·일부제외"
  },
  {
    label: "기기 승인",
    free: "—",
    paid: "—",
    b2b: "대표 승인"
  },
  {
    label: "회선·역할",
    free: "—",
    paid: "—",
    b2b: "관리"
  },
  {
    label: "구독 요금",
    free: "무료",
    paid: `월 ${formatKrw(PAID_LIST_PRICE_MONTHLY_KRW)}`,
    b2b: `대표 ${formatKrw(PAID_LIST_PRICE_MONTHLY_KRW)}`
  },
  {
    label: "추천인 할인",
    free: "—",
    paid: "30%",
    b2b: "단체할인"
  },
  {
    label: "상점",
    free: "—",
    paid: "입점 신청 후",
    b2b: "자동 입점"
  }
];

export const MEMBERSHIP_PLAN_DETAILS = {
  free: {
    id: "free",
    title: "일반 회원 (Free)",
    badge: "무료",
    accent: "slate",
    headline: "안전한 통화·생활 업무 지원",
    bullets: [
      "일반 통화 시 수신 화면에서 발신자 신원 확인 서비스를 이용합니다.",
      "업무와 일상에 필요한 서류 양식을 제공받습니다.",
      "VLUE PAGE로 프로필·활동 소개를 운영합니다.",
      "PASS·휴대폰 본인확인과 생체 등록으로 안전 거래 기반을 만듭니다.",
      "게시물·활동 보드·일반 VLUER(5% 포인트 리워드)을 이용합니다."
    ]
  },
  paid: {
    id: "paid",
    title: "유료 회원 (Paid)",
    badge: "구독",
    accent: "blue",
    headline: "디지털 명함 · AI 광고 · 가족보호",
    bullets: [
      "일반 통화 시 수신 화면 발신자 신원 확인 + 디지털 인증 명함을 제공합니다.",
      "AI 알고리즘으로 안정적이고 저렴한 광고, 지역 일반 기본 광고 서비스가 제공됩니다.",
      FAMILY_PROTECTION_SUMMARY,
      "일반 회원 혜택(서류 양식·VLUE PAGE·활동 보드 등)을 모두 포함합니다.",
      "월·연 구독(연간 2개월 무료) 및 추천인 코드 30% 할인을 선택할 수 있습니다.",
      "VLUER 업그레이드(인증·파트너)와 리워드·캐시 정산이 적용됩니다.",
      "입점 신청·승인 후 상점·상품 운영이 가능합니다."
    ]
  },
  b2b: {
    id: "b2b",
    title: "기업 단체 회원 (B2B)",
    badge: "기업",
    accent: "indigo",
    headline: "유료 혜택 + 사내 협업·구매·보안",
    bullets: [
      B2B_ENTERPRISE_SUMMARY,
      "유료 회원 혜택(디지털 명함·AI광고·서류 양식 등)을 회선 단위로 포함합니다. 가족보호는 개인(유료) 계정에서만 이용합니다.",
      "기업 CI/BI가 적용된 디지털 명함과 회사 대표번호 연동을 지원합니다.",
      "회선 등록이 완료되면 사내 그룹 채팅방이 자동 개설되며, 실시간으로 비품·업무 공지를 확인합니다.",
      "경리·대표는 공용 장바구니·법인카드·공용 예산으로 사내 비품을 결제하고, 세무·결제 내역을 보낼 수 있습니다.",
      "직원은 구매 요청을 올리고, 대표·대리인은 PC·기기 로그인을 승인하며, 회선·역할(경리·대리인·직원)을 관리합니다.",
      "VLUER 추천 프로그램은 해당 없습니다(업무 전용 회선). 개인 계정에서 이용할 수 있습니다.",
      "판매업·유통 등 해당 사업자는 자동 입점 후 기업 상점을 개설·운영할 수 있습니다."
    ]
  }
};
