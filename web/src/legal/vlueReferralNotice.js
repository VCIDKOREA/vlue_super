/** 가입·약관 — VLUÉ 추천인·파트너·재가입 정책 (2026-10) */

export const REFERRAL_PRECAUTION_TITLE = "VLUÉ 추천인 이벤트 및 수수료 지급 규정";

export const REFERRAL_PRECAUTION_CHECKBOX =
  "[중요] 추천인 할인·파트너 수수료는 본인인증 CI 기준 최초 1회 신규 가입에만 적용되며, 재가입·중복 가입·내선/대표번호 추가에는 적용되지 않음에 동의합니다.";

/** @deprecated alias — onboarding checkbox */
export const REFERRAL_PRECAUTION_AGREE = REFERRAL_PRECAUTION_CHECKBOX;

export const REFERRAL_POLICY_LINES = [
  "추천 혜택 적용 대상: 추천인 할인 및 파트너 수수료 지급은 VLUÉ 서비스에 최초로 가입하는 신규 회원(본인인증 CI 기준 1회)에 한하여 적용됩니다.",
  "재가입자 제한: 기존 회원이 탈퇴 후 재가입하거나, 동일한 사용자 정보(본인인증 식별값 CI 등)로 중복 가입하는 경우 추천인 코드 적용이 불가하며, 정상 결제 금액(모바일 이벤트가 월 14,100원 또는 정가)이 적용됩니다.",
  "부정행위 제재: 가입과 탈퇴를 반복하는 등 부정한 방법으로 추천 혜택을 다회 수급하거나 파트너 수수료를 발생시킨 경우, 해당 계정의 혜택은 즉시 취소되며 지급된 성과금은 환수될 수 있습니다.",
  "가격: 정가 월 28,300원 · 모바일 이벤트가 월 14,100원 / 연 141,000원(2개월 추가 무료) · 추천인 최초가입 월 9,900원 / 연 99,000원 · 내선·대표번호 추가 월 5,200원(추천인 할인 불가).",
  "정직원 인센티브: 유치 결제액 최대 10%(근무 기간 중) · 하부 외부파트너 매출 관리 포상 3%. 퇴직일 즉시 수급 권리 소멸·회사 귀속. 본 성과금은 평균임금·퇴직금 산정 대상이 아닙니다.",
  "외부 파트너: 유치 결제액 최대 7%(가입일로부터 최대 12개월) · 매월 신규 유료 10명 이상 유치 의무. 미달 시 자격 일시정지 및 기존 수수료 권리 회사 귀속. 독립 계약자 · 14일 확정 매출 · 개인 3.3% 원천징수 / 사업자 세금계산서."
];

/** @deprecated alias — onboarding bullets */
export const REFERRAL_PRECAUTION_BULLETS = REFERRAL_POLICY_LINES;

export const REFERRAL_FRIEND_DISCOUNT_NOTICE =
  "최초 가입(CI) + 추천인 코드 시 월 9,900원(이벤트가 14,100원 − 4,200원). 재가입·내선 추가는 추천 할인 불가.";

export const REFERRAL_PROGRAM_NOTICES = REFERRAL_POLICY_LINES;
