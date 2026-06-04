import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";

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

/**
 * 스폰서 VLUER가 직접 추천한 유료(active) 구독 회원 수
 */
export async function countPaidDirectReferrals(sponsorUserId: string): Promise<number> {
  try {
    const rows = await referralDb.referralAttribution.findMany({
      where: { sponsorVluerUserId: sponsorUserId },
      select: { userId: true }
    });
    if (rows.length === 0) return 0;

    const memberIds = rows.map((r: { userId: string }) => r.userId);
    return prisma.userSubscription.count({
      where: {
        userId: { in: memberIds },
        status: "active",
        plan: { in: ["b2c_monthly", "b2c_annual"] }
      }
    });
  } catch (err) {
    if (isReferralDbUnavailable(err)) return 0;
    throw err;
  }
}
