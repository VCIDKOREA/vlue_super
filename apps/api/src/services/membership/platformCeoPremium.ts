import { prisma } from "../../db/client.js";
import { isPlatformCeoHandle, PLATFORM_CEO_MEMBER } from "../admin/platformAccountRoles.js";

/**
 * 로그인 시 멤버십 티어 해석.
 * ceo 는 DB·구독을 Premium(paid)으로 강제 고정 후 반환.
 */
export async function resolveLoginMembershipTier(userId: string, publicHandle: string | null | undefined): Promise<string> {
  if (isPlatformCeoHandle(publicHandle)) {
    await ensurePlatformCeoPremium(userId);
    return PLATFORM_CEO_MEMBER.membershipTier;
  }

  const [card, sub] = await Promise.all([
    prisma.digitalCard.findUnique({
      where: { userId },
      select: { membershipTierSnapshot: true }
    }),
    prisma.userSubscription.findFirst({
      where: { userId, status: "active", cycleEndAt: { gt: new Date() } },
      select: { id: true }
    })
  ]);

  const snap = String(card?.membershipTierSnapshot || "").trim().toLowerCase();
  if (snap === "standard" || snap === "premium") return "paid";
  if (snap === "paid" || snap === "b2b" || snap === "free") return snap;
  if (sub) return "paid";
  return "free";
}

/** 대표 개인 계정 — 유료 스냅샷 + 장기 활성 구독 보장 */
export async function ensurePlatformCeoPremium(userId: string): Promise<void> {
  const now = new Date();
  const cycleEnd = new Date(now);
  cycleEnd.setFullYear(cycleEnd.getFullYear() + 5);

  await prisma.digitalCard.upsert({
    where: { userId },
    create: {
      userId,
      membershipTierSnapshot: PLATFORM_CEO_MEMBER.membershipTier
    },
    update: {
      membershipTierSnapshot: PLATFORM_CEO_MEMBER.membershipTier
    }
  });

  const active = await prisma.userSubscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (active) {
    await prisma.userSubscription.update({
      where: { id: active.id },
      data: {
        plan: "b2c_monthly",
        amountKrw: 9900,
        listPriceKrw: 28300,
        isDiscounted: true,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        portoneCustomerUid: `user_customer_${userId}`
      }
    });
    return;
  }

  await prisma.userSubscription.create({
    data: {
      userId,
      plan: "b2c_monthly",
      status: "active",
      amountKrw: 9900,
      listPriceKrw: 28300,
      isDiscounted: true,
      cycleStartAt: now,
      cycleEndAt: cycleEnd,
      nextChargeAt: cycleEnd,
      portoneCustomerUid: `user_customer_${userId}`
    }
  });
}
