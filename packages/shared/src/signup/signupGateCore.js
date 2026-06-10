import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { normalizeKrPhone } from "../phone/krPhone.js";
import { PROMO_BENEFIT_MONTHS, REJOIN_REFERRAL_PENALTY_MONTHS } from "../membership/membershipBmConstants.js";
export const DISCOUNT_RATE_PROMO_PCT = 30;
export const DISCOUNT_RATE_SLIDING_PCT = 15;
export class SignupGateValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "SignupGateValidationError";
    }
}
export function normalizePhoneNumber(phoneNumber) {
    const raw = String(phoneNumber || "").trim();
    if (!raw) {
        throw new SignupGateValidationError("휴대폰 번호가 필요합니다.");
    }
    const e164 = normalizeKrPhone(raw);
    if (!e164) {
        throw new SignupGateValidationError("휴대폰 번호 형식이 올바르지 않습니다.");
    }
    return e164;
}
export function hashPhoneNumberSha256(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    return createHash("sha256").update(normalized, "utf8").digest("hex");
}
export function hashCiBytesSha256Hex(ciHash) {
    return Buffer.from(ciHash).toString("hex");
}
export function resolveIdentityHash(input) {
    if (input.ciHash && input.ciHash.length > 0) {
        return hashCiBytesSha256Hex(input.ciHash);
    }
    const phone = String(input.phoneNumber || input.phoneE164 || "").trim();
    if (!phone) {
        throw new SignupGateValidationError("본인 식별(휴대폰 또는 CI)이 필요합니다.");
    }
    return hashPhoneNumberSha256(phone);
}
export function resolveRejoinConsumerDiscount(accumulatedUsingMonths) {
    const used = Math.max(0, Math.floor(accumulatedUsingMonths));
    if (used >= PROMO_BENEFIT_MONTHS) {
        return { currentDiscountRate: DISCOUNT_RATE_SLIDING_PCT, promoMonthsRemaining: 0 };
    }
    return {
        currentDiscountRate: DISCOUNT_RATE_PROMO_PCT,
        promoMonthsRemaining: PROMO_BENEFIT_MONTHS - used
    };
}
export function evaluateSignupBranchFromAbuseLog(hashedIdentity, abuseLog, referrerCodeInput) {
    if (!abuseLog) {
        return {
            branch: "brand_new",
            hashedIdentity,
            currentDiscountRate: DISCOUNT_RATE_PROMO_PCT,
            promoMonthsRemaining: PROMO_BENEFIT_MONTHS,
            accumulatedUsingMonths: 0,
            sponsorPenaltyMonthsLeft: 0,
            lastReferralCode: null,
            referrerCodeInput: referrerCodeInput ?? null,
            applyReferralRevenueLock: false
        };
    }
    const discount = resolveRejoinConsumerDiscount(abuseLog.accumulatedUsingMonths);
    return {
        branch: "rejoin_from_abuse_log",
        hashedIdentity,
        currentDiscountRate: discount.currentDiscountRate,
        promoMonthsRemaining: discount.promoMonthsRemaining,
        accumulatedUsingMonths: abuseLog.accumulatedUsingMonths,
        sponsorPenaltyMonthsLeft: REJOIN_REFERRAL_PENALTY_MONTHS,
        lastReferralCode: abuseLog.lastReferralCode,
        referrerCodeInput: referrerCodeInput ?? null,
        applyReferralRevenueLock: true
    };
}
