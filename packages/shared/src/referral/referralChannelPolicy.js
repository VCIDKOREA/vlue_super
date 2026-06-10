/**
 * VLUE 추천·리워드 2단계 정책 (2026 개편)
 * - friend: 지인 추천 (추천인 전화번호)
 * - promo: 홍보 추천 (VLUER 고유 코드 · SNS 인증 승인 후)
 */
/** 지인 추천 — 스폰서 리워드는 2번째 유료 추천부터 */
export const FRIEND_MIN_PAID_REFERRALS_FOR_REWARD = 2;
/** 피추천인 할인 */
export const REFERRED_DISCOUNT_RATE_FRIEND = 0.3;
export const REFERRED_DISCOUNT_RATE_PROMO_MONTHS_1_12 = 0.3;
export const REFERRED_DISCOUNT_RATE_PROMO_MONTHS_13_PLUS = 0.15;
/** 추천인 적립 — 지인 (1~12개월 포인트, 13개월~ 없음) */
export const FRIEND_SPONSOR_RATE_MONTHS_1_12 = 0.1;
/** 추천인 적립 — 홍보 VLUER (1~12개월 15% 캐시, 13개월~ 5% 영구) */
export const PROMO_SPONSOR_RATE_MONTHS_1_12 = 0.15;
export const PROMO_SPONSOR_RATE_MONTHS_13_PLUS = 0.05;
export const REFERRAL_CHANNEL_LABELS = {
    friend: {
        title: "지인 추천",
        codeLabel: "추천인 전화번호",
        qualification: "제한 없음 (누구나 지인에게 추천 가능)"
    },
    promo: {
        title: "홍보 추천",
        codeLabel: "VLUER 고유 추천 코드",
        qualification: "SNS·유튜브·틱톡 계정 인증 후 VLUER 승인 시"
    }
};
/** 입력값이 전화번호 형태면 지인 추천, 아니면 홍보(코드) 추천으로 분류 */
export function inferReferralChannelFromCode(raw) {
    const t = String(raw || "").trim();
    if (!t)
        return null;
    const digits = t.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 13)
        return "friend";
    return "promo";
}
/**
 * VLUER 홍보 승인 시: 기존 지인 추천으로 연결된 회원도 홍보(캐시) 정산 채널로 전환
 */
export function effectiveSettlementChannel(attributionChannel, sponsorVluerPromoActive) {
    if (sponsorVluerPromoActive)
        return "promo";
    return attributionChannel;
}
export function minPaidReferralsForSponsorReward(channel) {
    return channel === "friend" ? FRIEND_MIN_PAID_REFERRALS_FOR_REWARD : 1;
}
