/**
 * DCC(디지털인증명함) 접근 정책
 *
 * - 미성년자: DCC 전면 불가 (쇼케이스만)
 * - 유료 가족플랜 피보호자: 보호자 유료 혜택으로 DCC 포함 전체 V1 기능
 * - 그 외 유료·B2B: DCC 허용
 */
import {
  MINOR_DIGITAL_CARD_BLOCKED_MESSAGE,
  isMinorForParentalConsent
} from "@vlue/shared/policy/minor-signup";

/**
 * @param {{
 *   birthYmd?: string | null,
 *   isMinor?: boolean | null,
 *   familyPlanActive?: boolean
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

  /* 유료 가족플랜 피보호자 — 보호자 유료 혜택으로 DCC 포함 */
  if (Boolean(input.familyPlanActive)) {
    return { allowed: true, reason: "family_plan", message: "" };
  }

  return { allowed: true, reason: "", message: "" };
}

export function isDccSettingsDisabled(access) {
  return access && access.allowed === false;
}
