/** 레터링 빅푸시 — 무료 vs 유료 멤버십 */
export function isPaidLetteringTier(tier) {
  const t = String(tier || "free").toLowerCase();
  return t === "paid" || t === "standard" || t === "premium";
}

export { normalizeMembershipKind } from "./membershipBm.js";

export const LETTERING_FREE_LABEL = "VLUE \uC77C\uBC18\uBC88\uD638";
