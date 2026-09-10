/** VLUÉ 디지털 명함 — 등급별 카피·안내 (UI 공통) */
export const VLUE_CARD_CAUTION = "주의: 개인정보 요구에 유의하세요";

/** 유료·인증 빅푸시 펼침 — 앞면 하단 확인 문구 */
export const VLUE_VERIFIED_PUSH_CONFIRM = "VLUÉ 인증이 확인되었습니다.";

/** 미인증 발신 — 펼침·통화 중 주의 */
export const VLUE_UNVERIFIED_CAUTION = "금전·계좌 요구에 주의하세요.";

/** 미인증 펼침 — 하단 고정 면책 문구 */
export const VLUE_UNVERIFIED_REPORT_DISCLAIMER = "제보·신고는 참고용입니다.";

export function digitalCardBadgeText(tier) {
  if (tier === "premium") return "VLUÉ 공식인증 사용자";
  if (tier === "standard") return "VLUÉ 인증 사용자";
  return "VLUÉ 인증된 번호";
}

/** 스탠다드·프리미엄 앞면: 직함(조직명과 같으면 생략) + 성명 한 줄 */
export function digitalCardRoleLine({ title, name, organization }) {
  const org = String(organization || "").trim();
  const t = String(title || "").trim();
  const n = String(name || "").trim();
  const cleanTitle = t && t !== org ? t : "";
  return [cleanTitle, n].filter(Boolean).join(" ").trim();
}
