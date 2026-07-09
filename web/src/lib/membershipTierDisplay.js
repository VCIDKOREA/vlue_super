import { isB2bMembershipKind, isPaidMembershipKind, normalizeMembershipKind } from "./membershipBm.js";

/** 마이페이지·프로필용 멤버십 등급 라벨 */
export function formatMembershipTierLabel(tier) {
  const kind = normalizeMembershipKind(tier);
  if (isB2bMembershipKind(kind) || isPaidMembershipKind(kind)) {
    return "유료 (가족보호중)";
  }
  return "무료 (가족보호중)";
}

export function membershipTierStyleClass(tier, isDarkMode = false) {
  const kind = normalizeMembershipKind(tier);
  const paidLike = isB2bMembershipKind(kind) || isPaidMembershipKind(kind);
  return {
    label: formatMembershipTierLabel(tier),
    className: paidLike
      ? isDarkMode
        ? "text-blue-300"
        : "text-blue-600"
      : isDarkMode
        ? "text-white"
        : "text-gray-900"
  };
}
