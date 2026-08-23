/**
 * DCC(디지털인증명함) 접근 정책
 *
 * - 미성년자: DCC 전면 불가 (쇼케이스만)
 * - 가족 혜택 수혜자(자녀·노부모 등, 본인 인증결제 없음): DCC는 별도 1인 인증결제 필요
 * - 그 외: DCC 허용
 */
import {
  MINOR_DIGITAL_CARD_BLOCKED_MESSAGE,
  isMinorForParentalConsent
} from "@vlue/shared/policy/minor-signup";

export const FAMILY_DCC_OWN_AUTH_REQUIRED_MESSAGE =
  "가족 혜택으로 이용 중인 계정은 디지털인증명함(DCC)을 쓰려면 본인 명의 1인 인증 결제가 필요합니다.";

/**
 * @param {{
 *   birthYmd?: string | null,
 *   isMinor?: boolean | null,
 *   familyWardRole?: string | null,
 *   hasOwnAuthPayment?: boolean
 * }} input
 */
export function resolveDccFeatureAccess(input = {}) {
  const minorFlag =
    typeof input.isMinor === "boolean"
      ? input.isMinor
      : isMinorForParentalConsent(input.birthYmd ?? "") === true;
  if (minorFlag) {
    return {
      allowed: false,
      reason: "minor",
      message: MINOR_DIGITAL_CARD_BLOCKED_MESSAGE
    };
  }

  /* 가족 보호 피보호자(자녀·노부모) — 보호자 결제 혜택만 받는 경우 DCC는 별도 1인 인증결제 */
  const role = String(input.familyWardRole || "").trim().toLowerCase();
  const isFamilyWard = role === "child" || role === "elder";
  const hasOwnPay = Boolean(input.hasOwnAuthPayment);
  if (isFamilyWard && !hasOwnPay) {
    return {
      allowed: false,
      reason: "family_needs_own_auth",
      message: FAMILY_DCC_OWN_AUTH_REQUIRED_MESSAGE
    };
  }

  return { allowed: true, reason: "", message: "" };
}

export function isDccSettingsDisabled(access) {
  return access && access.allowed === false;
}
