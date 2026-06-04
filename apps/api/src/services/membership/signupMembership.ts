import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import type { B2BBillingCycle } from "../vluer/pricingConstants.js";
import {
  type PaidBillingCycle,
  paidChargeAmountKrw,
  paidListAmountKrw,
  REFERRAL_LOCK_MONTHS
} from "./membershipBmConstants.js";

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export async function resolveReferralSponsor(referralCodeInput: string | null | undefined) {
  const code = String(referralCodeInput || "")
    .trim()
    .toUpperCase();
  if (!code) return { sponsorUserId: null as string | null, referralCodeUsed: null as string | null };

  const sponsor = await prisma.userVluerProfile.findFirst({
    where: { referralCode: code },
    select: { userId: true, referralCode: true }
  });
  if (!sponsor?.referralCode) {
    throw new Error("유효하지 않은 추천인 코드입니다.");
  }
  return { sponsorUserId: sponsor.userId, referralCodeUsed: sponsor.referralCode };
}

export async function attachReferralAttribution(
  memberUserId: string,
  sponsorUserId: string,
  referralCodeUsed: string
) {
  const lockUntil = addMonths(new Date(), REFERRAL_LOCK_MONTHS);
  await referralDb.referralAttribution.upsert({
    where: { userId: memberUserId },
    create: {
      userId: memberUserId,
      sponsorVluerUserId: sponsorUserId,
      referralCodeUsed,
      codeChangeLockedUntil: lockUntil
    },
    update: {
      sponsorVluerUserId: sponsorUserId,
      referralCodeUsed
    }
  });
}

/** B2B 단체 — 가입 후 결제(pending_payment), 회선 수 기준 금액 */
export async function createB2bSubscriptionForUser(
  userId: string,
  billingCycle: B2BBillingCycle,
  lineCount: number,
  amountKrw: number,
  referralCodeUsed: string | null,
  sponsorUserId: string | null
) {
  const now = new Date();
  const cycleEnd = billingCycle === "annual" ? addMonths(now, 12) : addMonths(now, 1);
  const listPrice = amountKrw;

  return prisma.userSubscription.create({
    data: {
      userId,
      plan: billingCycle === "annual" ? "b2c_annual" : "b2c_monthly",
      status: "pending_payment",
      amountKrw,
      listPriceKrw: listPrice,
      isDiscounted: Boolean(referralCodeUsed),
      referralCodeUsed,
      sponsorVluerUserId: sponsorUserId,
      cycleStartAt: now,
      cycleEndAt: cycleEnd,
      nextChargeAt: cycleEnd
    }
  });
}

export async function createPaidSubscriptionForUser(
  userId: string,
  billingCycle: PaidBillingCycle,
  isDiscounted: boolean,
  referralCodeUsed: string | null,
  sponsorUserId: string | null
) {
  const listPrice = paidListAmountKrw(billingCycle);
  const amount = paidChargeAmountKrw(billingCycle, isDiscounted);
  const now = new Date();
  const cycleEnd = billingCycle === "annual" ? addMonths(now, 12) : addMonths(now, 1);

  return prisma.userSubscription.create({
    data: {
      userId,
      plan: billingCycle === "annual" ? "b2c_annual" : "b2c_monthly",
      status: "pending_payment",
      amountKrw: amount,
      listPriceKrw: listPrice,
      isDiscounted,
      referralCodeUsed,
      sponsorVluerUserId: sponsorUserId,
      cycleStartAt: now,
      cycleEndAt: cycleEnd,
      nextChargeAt: cycleEnd
    }
  });
}
