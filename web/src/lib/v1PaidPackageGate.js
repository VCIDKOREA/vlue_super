import { canUseV1PaidFeatures } from "./effectiveMembership.js";

export const V1_PAID_PACKAGE_GATE_EVENT = "vlue-v1-paid-package-gate";
export const V1_PAID_PACKAGE_UPGRADE_EVENT = "vlue-open-membership-upgrade";
export const V1_PAID_PACKAGE_MESSAGE = "V1유료 패키지 기능입니다.";

/** 디지털인증명함(DCC) 설정·송출 — V1 유료 멤버십 전용 (가족플랜 피보호자 포함) */
export function canUseV1PaidDccFeatures(membershipTier) {
  return canUseV1PaidFeatures(membershipTier);
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
