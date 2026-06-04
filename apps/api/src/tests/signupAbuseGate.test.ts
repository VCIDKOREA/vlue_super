import {
  DISCOUNT_RATE_PROMO_PCT,
  DISCOUNT_RATE_SLIDING_PCT,
  evaluateSignupBranchFromAbuseLog,
  hashPhoneNumberSha256,
  resolveRejoinConsumerDiscount
} from "@vlue/shared/signup";

function assertEq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function run() {
  const h1 = hashPhoneNumberSha256("01012345678");
  const h2 = hashPhoneNumberSha256("010-1234-5678");
  assertEq(h1, h2, "phone normalize hash");

  const fresh = evaluateSignupBranchFromAbuseLog("abc", null, "PARTNER01");
  assertEq(fresh.branch, "brand_new", "branch new");
  assertEq(fresh.currentDiscountRate, DISCOUNT_RATE_PROMO_PCT, "new discount 30");
  assertEq(fresh.applyReferralRevenueLock, false, "no lock");

  const rejoin5 = evaluateSignupBranchFromAbuseLog(
    "abc",
    { accumulatedUsingMonths: 5, lastReferralCode: "OLD01" },
    "NEW99"
  );
  assertEq(rejoin5.branch, "rejoin_from_abuse_log", "rejoin branch");
  assertEq(rejoin5.currentDiscountRate, DISCOUNT_RATE_PROMO_PCT, "5mo still 30");
  assertEq(rejoin5.promoMonthsRemaining, 7, "7 months left");
  assertEq(rejoin5.sponsorPenaltyMonthsLeft, 6, "6mo referral lock");
  assertEq(rejoin5.applyReferralRevenueLock, true, "lock on");

  const rejoin12 = evaluateSignupBranchFromAbuseLog("abc", {
    accumulatedUsingMonths: 12,
    lastReferralCode: "OLD01"
  });
  assertEq(rejoin12.currentDiscountRate, DISCOUNT_RATE_SLIDING_PCT, "12mo -> 15");
  assertEq(rejoin12.promoMonthsRemaining, 0, "no promo left");

  const slide = resolveRejoinConsumerDiscount(13);
  assertEq(slide.currentDiscountRate, 15, "resolve 13");

  console.log("[signup-abuse-gate] ok");
}

run();
