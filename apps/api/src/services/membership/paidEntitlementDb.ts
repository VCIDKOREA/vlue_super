import { prisma } from "../../db/client.js";
import { isPlatformCeoHandle } from "../admin/platformAccountRoles.js";

/** 스냅샷 명함 등 레거시 캐시를 배제한 현재 DB 유료 상태. */
export async function hasCurrentSelfPaidEntitlement(userId: string): Promise<boolean> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      publicHandle: true,
      status: true,
      accountStatus: true,
      enterpriseRole: true,
      isEnterpriseVerified: true,
      subscriptions: {
        where: { status: "active", cycleEndAt: { gt: now } },
        take: 1,
        select: { id: true }
      },
      lineSubscriptions: {
        where: { status: "active", cycleEndAt: { gt: now } },
        take: 1,
        select: { id: true }
      },
      corporateMembership: {
        select: { enterprise: { select: { status: true } } }
      },
      b2bEnterprisesAdministered: {
        where: { status: "active" },
        take: 1,
        select: { id: true }
      }
    }
  });
  if (!user || user.status !== "ACTIVE" || user.accountStatus === "suspended") return false;
  if (isPlatformCeoHandle(user.publicHandle)) return true;
  if (user.subscriptions.length || user.lineSubscriptions.length) return true;
  if (user.corporateMembership?.enterprise.status === "active") return true;
  if (user.b2bEnterprisesAdministered.length) return true;
  return user.enterpriseRole !== "NONE" && user.isEnterpriseVerified;
}

export async function resolveCurrentFamilyBeneficiary(wardUserId: string): Promise<{
  active: boolean;
  guardianUserId?: string;
}> {
  const links = await prisma.familyProtectionLink.findMany({
    where: { wardUserId, status: "active" },
    orderBy: { updatedAt: "desc" },
    select: { guardianUserId: true }
  });
  for (const link of links) {
    if (await hasCurrentSelfPaidEntitlement(link.guardianUserId)) {
      return { active: true, guardianUserId: link.guardianUserId };
    }
  }
  return { active: false };
}
