/**
 * DCC(디지털인증명함) 접근 정책
 *
 * - 미성년자: DCC 전면 불가 (쇼케이스만)
 * - DCC 발급·이용은 본인 정식 유료/B2B 구독만 (가족플랜 미포함)
 *   → 유료 여부는 canUseV1PaidDccFeatures 에서 판정
 * - 본 함수는 미성년자 차단 등 추가 제한만 담당
 */
import {
  MINOR_DIGITAL_CARD_BLOCKED_MESSAGE,
  isMinorForParentalConsent
} from "@vlue/shared/policy/minor-signup";

/**
 * @param {{
 *   birthYmd?: string | null,
 *   isMinor?: boolean | null
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

  return { allowed: true, reason: "", message: "" };
}

export function isDccSettingsDisabled(access) {
  return access && access.allowed === false;
}
