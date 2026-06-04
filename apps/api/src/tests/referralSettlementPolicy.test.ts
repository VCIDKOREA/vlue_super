import {
  FIXED_PAYOUT_CERTIFIED_PROMO_KRW,
  FIXED_PAYOUT_LEGACY_MONTHLY_KRW,
  FIXED_PAYOUT_PARTNER_PROMO_KRW,
  partnerNetPayoutKrw,
  promoMonthsRemaining,
  quoteSubscriptionReferralCommission,
  resolveSlidingConsumerChargeKrw
} from "@vlue/shared/settlement";
import {
  PAID_MONTHLY_DISCOUNTED_KRW,
  PROMO_BENEFIT_MONTHS,
  PROMO_SUPPLY_MONTHLY_KRW,
  SLIDING_RENEWAL_MONTHLY_KRW
} from "@vlue/shared/membership";

function assertEq(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function run() {
  assertEq(
    partnerNetPayoutKrw(PROMO_SUPPLY_MONTHLY_KRW, 0.1),
    FIXED_PAYOUT_CERTIFIED_PROMO_KRW,
    "certified promo net"
  );
  assertEq(
    partnerNetPayoutKrw(PROMO_SUPPLY_MONTHLY_KRW, 0.15),
    FIXED_PAYOUT_PARTNER_PROMO_KRW,
    "partner promo net"
  );
  assertEq(FIXED_PAYOUT_LEGACY_MONTHLY_KRW, 1_058, "legacy fixed constant");

  const certified = quoteSubscriptionReferralCommission({
    sponsorGrade: "certified",
    benefitMonthIndex: 6,
    sponsorPenaltyActive: false,
    billingCycle: "monthly"
  });
  assertEq(certified.commissionKrw, 1_741, "certified month 6");

  const penalized = quoteSubscriptionReferralCommission({
    sponsorGrade: "partner",
    benefitMonthIndex: 3,
    sponsorPenaltyActive: true,
    billingCycle: "monthly"
  });
  assertEq(penalized.commissionKrw, 0, "rejoin penalty");
  if (penalized.blockedReason !== "rejoin_abuse_penalty") {
    throw new Error("penalty reason");
  }

  const legacy = quoteSubscriptionReferralCommission({
    sponsorGrade: "partner",
    benefitMonthIndex: 13,
    sponsorPenaltyActive: false,
    billingCycle: "monthly"
  });
  assertEq(legacy.commissionKrw, 1_058, "legacy month 13");

  assertEq(promoMonthsRemaining(8), 4, "promo remaining");
  assertEq(promoMonthsRemaining(12), 0, "promo exhausted");

  const slide = resolveSlidingConsumerChargeKrw(12, "monthly", { hadPromoEligibility: true });
  assertEq(slide.amountKrw, SLIDING_RENEWAL_MONTHLY_KRW, "sliding consumer charge");
  const promo = resolveSlidingConsumerChargeKrw(5, "monthly", { hadPromoEligibility: true });
  assertEq(promo.amountKrw, PAID_MONTHLY_DISCOUNTED_KRW, "promo consumer charge");

  console.log("[referral-settlement-policy] ok", {
    promoMonths: PROMO_BENEFIT_MONTHS
  });
}

run();
