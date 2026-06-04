import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import { attachReferralAttribution, resolveReferralSponsor } from "./signupMembership.js";
import { assertPersonalReferralAllowed } from "./enterpriseReferralAttribution.js";

/**
 * 사후 추천인 등록 — 다음 결제 주기부터 30% 할인 예약
 * (가입 시 추천인 없이 정가 결제한 유료 회원)
 */
export async function schedulePostReferralDiscount(userId: string, referralCodeInput: string) {
  await assertPersonalReferralAllowed(userId);

  const { sponsorUserId, referralCodeUsed } = await resolveReferralSponsor(referralCodeInput);
  if (!sponsorUserId) {
    throw new Error("유효하지 않은 추천인 코드입니다.");
  }
  if (sponsorUserId === userId) {
    throw new Error("본인의 추천인 코드는 사용할 수 없습니다.");
  }

  await attachReferralAttribution(userId, sponsorUserId, referralCodeUsed!);

  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" }
  });
  if (!sub) {
    throw new Error("활성 유료 구독이 없습니다.");
  }
  if (sub.isDiscounted) {
    return { scheduled: false, message: "이미 할인 구독이 적용 중입니다.", subscriptionId: sub.id };
  }

  await prisma.userSubscription.update({
    where: { id: sub.id },
    data: {
      isDiscountedNextCycle: true,
      sponsorVluerUserId: sponsorUserId,
      referralCodeUsed: referralCodeUsed
    }
  });

  return {
    scheduled: true,
    subscriptionId: sub.id,
    referralCodeUsed,
    message: "다음 결제 주기부터 30% 할인이 적용됩니다."
  };
}
