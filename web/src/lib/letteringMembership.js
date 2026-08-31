/** 레터링 빅푸시 — 무료 vs 유료 멤버십 (기업 B2B 포함) */
export function isPaidLetteringTier(tier) {
  const t = String(tier || "free").toLowerCase();
  return t === "paid" || t === "standard" || t === "premium" || t === "b2b";
}

/**
 * 통화·오버레이에서 상대(peer) DCC/유료 쇼케이스 허용 여부.
 * canUseV1PaidFeatures() 와 달리 로컬 로그인·가족플랜 캐시를 쓰지 않음 — tier 누락 시 false.
 */
export function peerMayUsePaidCallFeatures(peerMembershipTier) {
  const t = String(peerMembershipTier || "").trim().toLowerCase();
  if (!t) return false;
  return isPaidLetteringTier(t);
}

export { normalizeMembershipKind } from "./membershipBm.js";

export const LETTERING_FREE_LABEL = "VLUE \uC77C\uBC18\uBC88\uD638";
