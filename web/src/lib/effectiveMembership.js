import { readMembershipTier } from "./bizcardAccountSync.js";
import { peekFamilyProtectionCache } from "./familyProtectionApi.js";
import { isPaidLetteringTier } from "./letteringMembership.js";

/** @typedef {{ active?: boolean, guardianName?: string, guardianTier?: string, pathLabel?: string }} FamilyPlanBeneficiary */

/** sessionStorage 가족보호 캐시에서 피보호자·가족플랜 정보 */
export function readFamilyPlanBeneficiary() {
  const data = peekFamilyProtectionCache();
  const b = data?.familyPlanBeneficiary;
  if (b && b.active) return b;
  return { active: false };
}

/**
 * 청구 티어(raw) + 가족플랜 → 기능 게이트용 effective tier
 * @param {string} [rawTier]
 * @param {FamilyPlanBeneficiary} [beneficiary]
 */
export function resolveEffectiveMembershipTier(rawTier, beneficiary) {
  const raw = String(rawTier ?? readMembershipTier()).toLowerCase();
  if (isPaidLetteringTier(raw)) return raw;
  const b = beneficiary ?? readFamilyPlanBeneficiary();
  if (b?.active) return "paid";
  return raw || "free";
}

/** 기능 권한 판단용 — DCC·쇼케이스 페이지·BGM 등 */
export function readEffectiveMembershipTier() {
  return resolveEffectiveMembershipTier(readMembershipTier());
}

/**
 * @param {string} [membershipTier] — 미전달 시 effective tier 사용
 */
export function canUseV1PaidFeatures(membershipTier) {
  const tier =
    membershipTier != null && String(membershipTier).trim()
      ? resolveEffectiveMembershipTier(membershipTier)
      : readEffectiveMembershipTier();
  return isPaidLetteringTier(tier);
}

/** 관리자·프로필 표시용 멤버십 경로 라벨 */
export function formatClientMembershipPathLabel(rawTier, beneficiary) {
  const raw = String(rawTier || "free").toLowerCase();
  if (isPaidLetteringTier(raw)) {
    if (raw === "b2b") return "B2B";
    return "유료";
  }
  const b = beneficiary ?? readFamilyPlanBeneficiary();
  if (b?.active && b.pathLabel) return b.pathLabel;
  return "무료";
}
