import {
  hasCurrentSelfPaidEntitlement,
  resolveCurrentFamilyBeneficiary
} from "./paidEntitlementDb.js";

export type UserPolicyTier = "free" | "family" | "paid";

export type UserPolicySnapshot = {
  tier: UserPolicyTier;
  dccEnabled: boolean;
  cyanBadgeActive: boolean;
  familyHostInviteLimit: number;
  familyWardBenefits: boolean;
  showcaseSlotLimit: number;
  bgmTrackLimit: number;
  rewardedAdsRequired: boolean;
};

/**
 * 수익화·회원 혜택의 단일 서버 SoT.
 * 통화 경로/신원 검증(is_verified)과 구독형 시안블루 배지는 서로 다른 상태다.
 */
export async function resolveUserPolicy(userId: string): Promise<UserPolicySnapshot> {
  const selfPaid = await hasCurrentSelfPaidEntitlement(userId);
  if (selfPaid) {
    return {
      tier: "paid",
      dccEnabled: true,
      cyanBadgeActive: true,
      familyHostInviteLimit: 3,
      familyWardBenefits: false,
      showcaseSlotLimit: 5,
      bgmTrackLimit: 5,
      rewardedAdsRequired: false
    };
  }

  const family = await resolveCurrentFamilyBeneficiary(userId);
  if (family.active) {
    return {
      tier: "family",
      dccEnabled: false,
      cyanBadgeActive: true,
      familyHostInviteLimit: 0,
      familyWardBenefits: true,
      showcaseSlotLimit: 5,
      bgmTrackLimit: 5,
      rewardedAdsRequired: false
    };
  }

  return {
    tier: "free",
    dccEnabled: false,
    cyanBadgeActive: false,
    familyHostInviteLimit: 0,
    familyWardBenefits: false,
    showcaseSlotLimit: 5,
    bgmTrackLimit: 1,
    rewardedAdsRequired: true
  };
}

