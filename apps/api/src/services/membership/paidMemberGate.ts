import { prisma } from "../../db/client.js";
import { userHasPremiumTier } from "../../middleware/cardGate.js";
import { resolveFamilyPlanBeneficiary } from "./familyPlanMembership.js";

const DEFAULT_DENY_REASON = "유료 구독 회원 전용 기능입니다.";

/** 활성 B2C 구독 · 유료 명함 스냅샷 · 가족플랜(유료 보호자) 피보호자 */
export async function isPaidMember(
  userId: string,
  denyReason = DEFAULT_DENY_REASON
): Promise<{ ok: boolean; reason?: string }> {
  if (await userHasPremiumTier(userId)) {
    return { ok: true };
  }

  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: "active", cycleEndAt: { gt: new Date() } },
    select: { id: true }
  });
  if (sub) return { ok: true };

  const card = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { membershipTierSnapshot: true }
  });
  const snap = card?.membershipTierSnapshot;
  if (snap === "paid" || snap === "standard" || snap === "premium" || snap === "b2b") {
    return { ok: true };
  }

  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId: userId, status: { in: ["draft", "active"] } },
    select: { id: true }
  });
  if (ent) return { ok: true };

  const familyPlan = await resolveFamilyPlanBeneficiary(userId);
  if (familyPlan.active) return { ok: true };

  return { ok: false, reason: denyReason };
}

export { resolveFamilyPlanBeneficiary, batchFamilyPlanPathLabels, resolveMembershipPathLabel } from "./familyPlanMembership.js";
