import { resolveFamilyPlanBeneficiary } from "./familyPlanMembership.js";
import { hasCurrentSelfPaidEntitlement } from "./paidEntitlementDb.js";

const DEFAULT_DENY_REASON = "유료 구독 회원 전용 기능입니다.";
const DCC_DENY_REASON = "디지털인증명함(DCC)은 본인 정식 유료 구독으로만 이용할 수 있습니다.";

/** 본인 활성 B2C 구독 · 유료 명함 스냅샷 · B2B (가족플랜 제외) */
export async function isSelfPaidMember(
  userId: string,
  denyReason = DCC_DENY_REASON
): Promise<{ ok: boolean; reason?: string }> {
  if (await hasCurrentSelfPaidEntitlement(userId)) return { ok: true };
  return { ok: false, reason: denyReason };
}

/** 쇼케이스·BGM 등 — 본인 유료 또는 가족플랜(유료 보호자) 피보호자. DCC는 isSelfPaidMember. */
export async function isPaidMember(
  userId: string,
  denyReason = DEFAULT_DENY_REASON
): Promise<{ ok: boolean; reason?: string }> {
  const self = await isSelfPaidMember(userId, denyReason);
  if (self.ok) return { ok: true };

  const familyPlan = await resolveFamilyPlanBeneficiary(userId);
  if (familyPlan.active) return { ok: true };

  return { ok: false, reason: denyReason };
}

export { resolveFamilyPlanBeneficiary, batchFamilyPlanPathLabels, resolveMembershipPathLabel } from "./familyPlanMembership.js";
