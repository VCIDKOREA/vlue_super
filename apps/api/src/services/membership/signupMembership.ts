import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import { normalizeKrPhone } from "@vlue/shared/phone";
import {
  inferReferralChannelFromCode,
  type ReferralChannel
} from "@vlue/shared/referral";
import { resolveProfileGrade, isVluerPromoActiveGrade } from "../vluer/tierEngine.js";
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

export type ReferralSponsorResolution = {
  sponsorUserId: string | null;
  referralCodeUsed: string | null;
  channel: ReferralChannel | null;
};

export async function resolveReferralSponsor(
  referralCodeInput: string | null | undefined
): Promise<ReferralSponsorResolution> {
  const raw = String(referralCodeInput || "").trim();
  if (!raw) {
    return { sponsorUserId: null, referralCodeUsed: null, channel: null };
  }

  const channelGuess = inferReferralChannelFromCode(raw);

  /** 지인 추천 — 추천인 전화번호 */
  if (channelGuess === "friend") {
    const phoneE164 = normalizeKrPhone(raw);
    if (!phoneE164) {
      throw new Error("유효하지 않은 추천인 전화번호입니다.");
    }
    const sponsor = await prisma.user.findFirst({
      where: { phoneE164 },
      select: { id: true, phoneE164: true }
    });
    if (!sponsor) {
      throw new Error("해당 전화번호로 가입한 VLUE 회원을 찾을 수 없습니다.");
    }
    const digits = raw.replace(/\D/g, "");
    return {
      sponsorUserId: sponsor.id,
      referralCodeUsed: digits,
      channel: "friend"
    };
  }

  /** 홍보 추천 — VLUER 고유 코드 (SNS 인증·승인 후) */
  const code = raw.toUpperCase();
  const sponsor = await prisma.userVluerProfile.findFirst({
    where: { referralCode: code },
    select: { userId: true, referralCode: true, tierCode: true, vluerGrade: true }
  });
  if (!sponsor?.referralCode) {
    throw new Error("유효하지 않은 추천인 코드입니다.");
  }

  const grade = resolveProfileGrade(sponsor);
  if (!isVluerPromoActiveGrade(grade)) {
    throw new Error(
      "홍보 추천 코드는 SNS·유튜브·틱톡 인증 후 VLUER 승인을 받은 회원만 사용할 수 있습니다."
    );
  }

  return {
    sponsorUserId: sponsor.userId,
    referralCodeUsed: sponsor.referralCode,
    channel: "promo"
  };
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
