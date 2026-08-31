import { familyProtectionDb } from "../../db/familyProtectionDb.js";
import { canRegisterFamilyMembers } from "../familyProtection/familyProtectionPaidGate.js";

export type FamilyPlanBeneficiary = {
  active: boolean;
  guardianUserId?: string;
  guardianName?: string;
  guardianTier?: string;
  pathLabel?: string;
};

function guardianDisplayName(u: {
  legalName?: string | null;
  nickFeed?: string | null;
  publicHandle?: string | null;
}) {
  return u.legalName?.trim() || u.nickFeed?.trim() || u.publicHandle?.trim() || "회원";
}

export function formatFamilyPlanPathLabel(guardianName: string) {
  const name = String(guardianName || "회원").trim() || "회원";
  return `무료(가족플랜) 가족명: ${name}(유료)`;
}

/** 활성 가족보호 피보호자 + 유료 보호자 → V1 유료 패키지 혜택 상속 */
export async function resolveFamilyPlanBeneficiary(wardUserId: string): Promise<FamilyPlanBeneficiary> {
  const link = await familyProtectionDb.familyProtectionLink.findFirst({
    where: { wardUserId, status: "active" },
    include: {
      guardianUser: { select: { id: true, legalName: true, publicHandle: true, nickFeed: true } }
    }
  });
  if (!link) return { active: false };

  const paid = await canRegisterFamilyMembers(link.guardianUserId);
  if (!paid.ok) return { active: false };

  const guardianName = guardianDisplayName(link.guardianUser || {});
  const pathLabel =
    link.membershipPathLabel?.trim() || formatFamilyPlanPathLabel(guardianName);
  return {
    active: true,
    guardianUserId: link.guardianUserId,
    guardianName,
    guardianTier: "paid",
    pathLabel
  };
}

/** 관리자 회원 목록 — 가족플랜 경로 라벨 일괄 조회 */
export async function batchFamilyPlanPathLabels(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return map;

  const links = await familyProtectionDb.familyProtectionLink.findMany({
    where: { wardUserId: { in: ids }, status: "active" },
    include: {
      guardianUser: { select: { legalName: true, publicHandle: true, nickFeed: true } }
    }
  });
  if (!links.length) return map;

  const guardianIds = [...new Set(links.map((l) => l.guardianUserId))];
  const paidGuardians = new Set<string>();
  await Promise.all(
    guardianIds.map(async (gid) => {
      const paid = await canRegisterFamilyMembers(gid);
      if (paid.ok) paidGuardians.add(gid);
    })
  );

  for (const link of links) {
    if (!paidGuardians.has(link.guardianUserId)) continue;
    const stored = link.membershipPathLabel?.trim();
    const name = guardianDisplayName(link.guardianUser || {});
    map.set(link.wardUserId, stored || formatFamilyPlanPathLabel(name));
  }
  return map;
}

/** 관리자 단일 회원 — 멤버십 경로 라벨 */
export async function resolveMembershipPathLabel(
  userId: string,
  membershipTier: string
): Promise<string> {
  const tier = String(membershipTier || "free").toLowerCase();
  if (tier === "paid" || tier === "standard" || tier === "premium") return "유료";
  if (tier === "b2b") return "B2B";
  const beneficiary = await resolveFamilyPlanBeneficiary(userId);
  if (beneficiary.active && beneficiary.pathLabel) return beneficiary.pathLabel;
  return "무료";
}
