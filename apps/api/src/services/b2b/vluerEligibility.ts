import { prisma } from "../../db/client.js";

/** B2B 기업 관리자·귀속 직원 — VLUER 활동·정산 원천 차단 */
export async function applyB2bVluerBlock(userId: string, reason = "b2b_corporate_membership") {
  const now = new Date();
  await prisma.userVluerProfile.upsert({
    where: { userId },
    create: {
      userId,
      canActAsVluer: false,
      isEligibleForVluerSettlement: false,
      rewardsFrozen: true,
      rewardsFrozenAt: now,
      b2bBlockedAt: now
    },
    update: {
      canActAsVluer: false,
      isEligibleForVluerSettlement: false,
      rewardsFrozen: true,
      rewardsFrozenAt: now,
      b2bBlockedAt: now
    }
  });
  return { ok: true, reason };
}

export async function isUserB2bSettlementExcluded(userId: string): Promise<boolean> {
  const [enterprise, membership, attribution, profile] = await Promise.all([
    prisma.b2BEnterpriseAccount.findFirst({
      where: { adminUserId: userId, status: { in: ["draft", "active"] } },
      select: { id: true }
    }),
    prisma.userCorporateMembership.findUnique({
      where: { userId },
      select: { userId: true }
    }),
    prisma.corporateAttributionRequest.findFirst({
      where: { memberUserId: userId, status: "approved" },
      select: { id: true }
    }),
    prisma.userVluerProfile.findUnique({
      where: { userId },
      select: { isEligibleForVluerSettlement: true, canActAsVluer: true }
    })
  ]);

  if (enterprise || membership || attribution) return true;
  if (profile && (!profile.canActAsVluer || !profile.isEligibleForVluerSettlement)) {
    return true;
  }
  return false;
}

export async function assertCanActAsVluer(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (await isUserB2bSettlementExcluded(userId)) {
    return {
      ok: false,
      error: "B2B 기업 회원 및 귀속 직원은 VLUER 추천 활동이 제한됩니다."
    };
  }
  const profile = await prisma.userVluerProfile.findUnique({ where: { userId } });
  if (profile && !profile.canActAsVluer) {
    return { ok: false, error: "VLUER 활동 권한이 없습니다." };
  }
  return { ok: true };
}
