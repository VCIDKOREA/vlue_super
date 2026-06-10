import {
  promoMonthsRemaining,
  quoteSubscriptionReferralCommission,
  resolveSlidingConsumerChargeKrw
} from "@vlue/shared/settlement";
import {
  PAID_MONTHLY_DISCOUNTED_KRW,
  PROMO_BENEFIT_MONTHS,
  SLIDING_RENEWAL_MONTHLY_KRW
} from "@vlue/shared/membership";

function assertEq(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function run() {
  const friendPromo = quoteSubscriptionReferralCommission({
    attributionChannel: "friend",
    sponsorVluerPromoActive: false,
    benefitMonthIndex: 3,
    sponsorPenaltyActive: false,
    billingCycle: "monthly",
    sponsorPaidReferralCount: 2
  });
  assertEq(friendPromo.commissionKrw, 1800, "friend 10% points month 3");
  if (friendPromo.payoutMode !== "reward_only") throw new Error("friend payout mode");

  const friendFirstOnly = quoteSubscriptionReferralCommission({
    attributionChannel: "friend",
    sponsorVluerPromoActive: false,
    benefitMonthIndex: 3,
    sponsorPenaltyActive: false,
    billingCycle: "monthly",
    sponsorPaidReferralCount: 1
  });
  assertEq(friendFirstOnly.commissionKrw, 0, "friend 1st referral no reward");
  if (friendFirstOnly.blockedReason !== "insufficient_paid_referrals") {
    throw new Error("friend first referral block reason");
  }

  const friendMonth13 = quoteSubscriptionReferralCommission({
    attributionChannel: "friend",
    sponsorVluerPromoActive: false,
    benefitMonthIndex: 13,
    sponsorPenaltyActive: false,
    billingCycle: "monthly",
    sponsorPaidReferralCount: 3
  });
  assertEq(friendMonth13.commissionKrw, 0, "friend month 13+ no reward");

  const promoEarly = quoteSubscriptionReferralCommission({
    attributionChannel: "promo",
    sponsorVluerPromoActive: true,
    benefitMonthIndex: 6,
    sponsorPenaltyActive: false,
    billingCycle: "monthly",
    sponsorPaidReferralCount: 1
  });
  assertEq(promoEarly.commissionKrw, 2611, "promo 15% cash month 6");
  if (promoEarly.payoutMode !== "cash_commission") throw new Error("promo payout mode");

  const promoLegacy = quoteSubscriptionReferralCommission({
    attributionChannel: "promo",
    sponsorVluerPromoActive: true,
    benefitMonthIndex: 14,
    sponsorPenaltyActive: false,
    billingCycle: "monthly",
    sponsorPaidReferralCount: 1
  });
  assertEq(promoLegacy.commissionKrw, 1057, "promo 5% cash month 14");

  const friendUpgraded = quoteSubscriptionReferralCommission({
    attributionChannel: "friend",
    sponsorVluerPromoActive: true,
    benefitMonthIndex: 6,
    sponsorPenaltyActive: false,
    billingCycle: "monthly",
    sponsorPaidReferralCount: 1
  });
  assertEq(friendUpgraded.commissionKrw, 2611, "friend sponsor upgraded to VLUER → cash 15%");

  assertEq(promoMonthsRemaining(8), 4, "promo remaining");
  assertEq(promoMonthsRemaining(12), 0, "promo exhausted");

  const friendCharge = resolveSlidingConsumerChargeKrw(13, "monthly", {
    hadPromoEligibility: true,
    referralChannel: "friend"
  });
  assertEq(friendCharge.amountKrw, PAID_MONTHLY_DISCOUNTED_KRW, "friend keeps 30% after month 12");

  const promoSlide = resolveSlidingConsumerChargeKrw(12, "monthly", {
    hadPromoEligibility: true,
    referralChannel: "promo"
  });
  assertEq(promoSlide.amountKrw, SLIDING_RENEWAL_MONTHLY_KRW, "promo 15% after month 12");

  console.log("[referral-settlement-policy] ok", { promoMonths: PROMO_BENEFIT_MONTHS });
}

run();
