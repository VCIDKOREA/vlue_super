import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import type { VluerGrade, VluerTierCode } from "./vluerGradeTypes.js";
import { totalMemberCount } from "./tierPolicyConstants.js";
import { countPaidDirectReferrals } from "./paidReferralCount.js";

export type { VluerTierCode, VluerGrade };

export function resolveProfileGrade(profile: {
  vluerGrade?: string | null;
  tierCode?: string | null;
}): VluerGrade {
  const g = profile.vluerGrade || profile.tierCode || "general";
  if (g === "certified" || g === "partner" || g === "official") return g;
  if (g === "professional") return "certified";
  if (g === "master") return "partner";
  return "general";
}

export async function getTierPolicy(grade: VluerGrade) {
  return prisma.vluerTierPolicy.findUnique({ where: { tierCode: grade } });
}

function isReferralDbUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("does not exist") ||
    msg.includes("Unknown column") ||
    msg.includes("Invalid `prisma") ||
    msg.includes("Cannot read properties of undefined") ||
    msg.includes("is not a function")
  );
}

async function safeReferralCount(run: () => Promise<number>): Promise<number> {
  try {
    return await run();
  } catch (err) {
    if (isReferralDbUnavailable(err)) return 0;
    throw err;
  }
}

export async function countDownlineUsers(sponsorUserId: string): Promise<number> {
  return safeReferralCount(() =>
    referralDb.referralAttribution.count({
      where: { sponsorVluerUserId: sponsorUserId }
    })
  );
}

export async function countAcquiredEnterprises(vluerUserId: string): Promise<number> {
  return safeReferralCount(() =>
    referralDb.b2BEnterpriseAccount.count({
      where: {
        acquiredByVluerUserId: vluerUserId,
        status: { in: ["active", "pending_doc_verification"] }
      }
    })
  );
}

/** 추천·기업 유치 수만 갱신 — 등급은 선택형 업그레이드 API로만 변경 */
export async function syncUserVluerTier(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    (err as Error & { code?: string }).code = "USER_NOT_FOUND";
    throw err;
  }

  const profile = await prisma.userVluerProfile.upsert({
    where: { userId },
    create: { userId, vluerGrade: "general", tierCode: "general" },
    update: {}
  });

  const downline = await countDownlineUsers(userId);
  const enterprises = await countAcquiredEnterprises(userId);
  const paidReferrals = await countPaidDirectReferrals(userId);

  const prevEnt = profile.cumulativeB2bEnterprises ?? 0;
  if (downline !== profile.cumulativeB2cReferrals || enterprises !== prevEnt) {
    return prisma.userVluerProfile.update({
      where: { userId },
      data: {
        cumulativeB2cReferrals: downline,
        cumulativeB2bEnterprises: enterprises
      }
    });
  }
  return profile;
}

export { totalMemberCount };

export async function runVluerTierSchedulerBatch(limit = 200) {
  const profiles = await prisma.userVluerProfile.findMany({
    take: limit,
    orderBy: { updatedAt: "asc" },
    select: { userId: true }
  });
  let scanned = 0;
  for (const p of profiles) {
    await syncUserVluerTier(p.userId);
    scanned += 1;
  }
  return { scanned, tierChanged: 0, note: "auto_tier_disabled_use_upgrade_api" };
}
