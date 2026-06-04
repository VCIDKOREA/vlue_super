import { prisma } from "../../db/client.js";
import { userHasPremiumTier } from "../../middleware/cardGate.js";

/** 유료(스탠다드/프리미엄 명함 또는 활성 B2C 구독) 회원만 가족 초대 가능 */
export async function canRegisterFamilyMembers(userId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
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
  if (snap === "paid" || snap === "standard" || snap === "premium") {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "일반 회원은 가족 보호 초대를 이용할 수 없습니다. (0명) 유료 멤버십 전환 후 이용해 주세요."
  };
}
