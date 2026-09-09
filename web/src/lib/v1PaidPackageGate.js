import { readMembershipTier } from "./bizcardAccountSync.js";
import {
  canUseV1PaidFeatures,
  readFamilyPlanBeneficiary
} from "./effectiveMembership.js";
import { isPaidLetteringTier } from "./letteringMembership.js";

export const V1_PAID_PACKAGE_GATE_EVENT = "vlue-v1-paid-package-gate";
export const V1_PAID_PACKAGE_UPGRADE_EVENT = "vlue-open-membership-upgrade";
export const V1_PAID_PACKAGE_MESSAGE = "V1유료 패키지 기능입니다.";

/**
 * 디지털인증명함(DCC) 설정·발급·송출 — 본인 정식 유료/B2B 구독만.
 * 가족플랜으로 승격된 effective tier는 적용하지 않음 (쇼케이스·BGM과 분리).
 * @param {string} [membershipTier] 청구 티어(raw). effective "paid"를 넣어도 가족플랜이면 거부.
 */
export function canUseV1PaidDccFeatures(membershipTier) {
  const billing = String(readMembershipTier() || "free").toLowerCase();
  if (isPaidLetteringTier(billing)) return true;

  /* 로컬 청구가 무료인데 인자만 paid → 가족플랜 effective 오인 방지 */
  if (Boolean(readFamilyPlanBeneficiary()?.active)) return false;

  const raw =
    membershipTier != null && String(membershipTier).trim()
      ? String(membershipTier).toLowerCase()
      : billing;
  return isPaidLetteringTier(raw);
}

export function requestV1PaidPackageGate() {
  try {
    window.dispatchEvent(new Event(V1_PAID_PACKAGE_GATE_EVENT));
  } catch {
    /* ignore */
  }
}

export function requestMembershipUpgradePanel() {
  try {
    window.dispatchEvent(new Event(V1_PAID_PACKAGE_UPGRADE_EVENT));
  } catch {
    /* ignore */
  }
}

export { canUseV1PaidFeatures };
