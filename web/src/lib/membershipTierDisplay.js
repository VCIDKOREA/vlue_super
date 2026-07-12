import { isB2bMembershipKind, isPaidMembershipKind, normalizeMembershipKind } from "./membershipBm.js";

/** 활성 가족 보호 연결이 있을 때 */
export const FAMILY_PROTECTION_STATUS_ACTIVE = "가족보호 작동중";
/** 유료인데 아직 보호 대상 미등록 */
export const FAMILY_PROTECTION_STATUS_AVAILABLE = "가족보호 신청가능";

/**
 * @param {string} [tier]
 * @param {{ familyProtectionActive?: boolean }} [opts]
 * @returns {{ base: string, familyStatus: string|null, familyLinkable: boolean, label: string }}
 */
export function formatMembershipTierParts(tier, opts = {}) {
  const kind = normalizeMembershipKind(tier);
  const paidLike = isB2bMembershipKind(kind) || isPaidMembershipKind(kind);
  const familyActive = Boolean(opts.familyProtectionActive);
  if (!paidLike) {
    return { base: "무료", familyStatus: null, familyLinkable: false, label: "무료" };
  }
  const familyStatus = familyActive
    ? FAMILY_PROTECTION_STATUS_ACTIVE
    : FAMILY_PROTECTION_STATUS_AVAILABLE;
  return {
    base: "유료",
    familyStatus,
    familyLinkable: !familyActive,
    /* 등급칸은 짧게 — 가족보호 문구는 별도 버튼 */
    label: "유료"
  };
}

/**
 * @param {string} [tier]
 * @param {{ familyProtectionActive?: boolean }} [opts]
 */
export function formatMembershipTierLabel(tier, opts = {}) {
  return formatMembershipTierParts(tier, opts).label;
}

/**
 * @param {string} [tier]
 * @param {boolean} [isDarkMode]
 * @param {{ familyProtectionActive?: boolean }} [opts]
 */
export function membershipTierStyleClass(tier, isDarkMode = false, opts = {}) {
  const kind = normalizeMembershipKind(tier);
  const paidLike = isB2bMembershipKind(kind) || isPaidMembershipKind(kind);
  const parts = formatMembershipTierParts(tier, opts);
  return {
    label: parts.label,
    parts,
    className: paidLike
      ? isDarkMode
        ? "text-blue-300"
        : "text-blue-600"
      : isDarkMode
        ? "text-white"
        : "text-gray-900"
  };
}

/** API/피어 집합 → 보호중 여부 */
export function isFamilyProtectionActiveFromPeers(peers) {
  if (!peers) return false;
  const users = peers.userIds;
  const handles = peers.handles;
  if (users && typeof users.size === "number" && users.size > 0) return true;
  if (handles && typeof handles.size === "number" && handles.size > 0) return true;
  if (Array.isArray(users) && users.length > 0) return true;
  if (Array.isArray(handles) && handles.length > 0) return true;
  return false;
}
