import { ensureSignupVluerProfile } from "../vluer/activityTierEngine.js";
import { B2B_MIN_LINES, b2bEnterpriseTotalKrw, type B2BBillingCycle } from "../vluer/pricingConstants.js";
import {
  normalizeMembershipKind,
  type MembershipKind,
  type PaidBillingCycle
} from "./membershipBmConstants.js";
import {
  attachReferralAttribution,
  createB2bSubscriptionForUser,
  createPaidSubscriptionForUser,
  resolveReferralSponsor
} from "./signupMembership.js";
import { assertPersonalReferralAllowed } from "./enterpriseReferralAttribution.js";

export type SignupMembershipInput = {
  userId: string;
  isNewUser: boolean;
  membershipKind?: string | null;
  billingCycle?: string | null;
  referralCodeInput?: string | null;
  /** B2B 가입 시 접수 회선 수(VLUE 인증번호 포함) */
  plannedLineCount?: number | null;
};

export async function applySignupMembershipBundle(input: SignupMembershipInput) {
  if (!input.isNewUser) return { applied: false as const };

  const kind: MembershipKind = normalizeMembershipKind(input.membershipKind);
  const cycle: PaidBillingCycle =
    String(input.billingCycle || "monthly").toLowerCase() === "annual" ? "annual" : "monthly";

  await ensureSignupVluerProfile(input.userId);

  if (kind === "free") {
    const freeResult = {
      applied: true as const,
      membershipKind: kind,
      vluerGrade: "general" as const,
      isDiscounted: false
    };
    console.info("[E2E signup-membership]", JSON.stringify(freeResult));
    return freeResult;
  }

  if (kind === "b2b") {
    let sponsorUserId: string | null = null;
    let referralCodeUsed: string | null = null;
    const codeRaw = String(input.referralCodeInput || "").trim();
    if (codeRaw) {
      const ref = await resolveReferralSponsor(codeRaw);
      if (ref.sponsorUserId === input.userId) {
        throw new Error("본인의 추천인 코드는 사용할 수 없습니다.");
      }
      sponsorUserId = ref.sponsorUserId;
      referralCodeUsed = ref.referralCodeUsed;
    }
    const planned = Math.floor(Number(input.plannedLineCount) || 0);
    const lineCount = planned >= B2B_MIN_LINES ? planned : B2B_MIN_LINES;
    const b2bCycle: B2BBillingCycle = cycle;
    const amountKrw = b2bEnterpriseTotalKrw(lineCount, b2bCycle, {
      hasReferral: Boolean(referralCodeUsed)
    });

    const sub = await createB2bSubscriptionForUser(
      input.userId,
      b2bCycle,
      lineCount,
      amountKrw,
      referralCodeUsed,
      sponsorUserId
    );

    if (sponsorUserId && referralCodeUsed) {
      await attachReferralAttribution(input.userId, sponsorUserId, referralCodeUsed);
    }

    const result = {
      applied: true as const,
      membershipKind: "b2b" as const,
      vluerGrade: "general" as const,
      isDiscounted: Boolean(referralCodeUsed),
      lineCount,
      subscriptionId: sub?.id,
      billingCycle: cycle,
      amountKrw: sub?.amountKrw,
      listPriceKrw: sub?.listPriceKrw,
      referralCodeUsed: sub?.referralCodeUsed ?? null,
      sponsorVluerUserId: sponsorUserId
    };
    console.info("[E2E signup-membership]", JSON.stringify(result));
    return result;
  }

  let sponsorUserId: string | null = null;
  let referralCodeUsed: string | null = null;
  const codeRaw = String(input.referralCodeInput || "").trim();
  if (codeRaw) {
    await assertPersonalReferralAllowed(input.userId);
    const ref = await resolveReferralSponsor(codeRaw);
    sponsorUserId = ref.sponsorUserId;
    referralCodeUsed = ref.referralCodeUsed;
    if (sponsorUserId === input.userId) {
      throw new Error("본인의 추천인 코드는 사용할 수 없습니다.");
    }
  }

  const isDiscounted = Boolean(referralCodeUsed);
  const sub = await createPaidSubscriptionForUser(
    input.userId,
    cycle,
    isDiscounted,
    referralCodeUsed,
    sponsorUserId
  );

  if (sponsorUserId && referralCodeUsed) {
    await attachReferralAttribution(input.userId, sponsorUserId, referralCodeUsed);
  }

  const result = {
    applied: true as const,
    membershipKind: kind,
    vluerGrade: "general" as const,
    isDiscounted,
    subscriptionId: sub?.id,
    billingCycle: cycle,
    amountKrw: sub?.amountKrw,
    listPriceKrw: sub?.listPriceKrw,
    referralCodeUsed: sub?.referralCodeUsed ?? null,
    sponsorVluerUserId: sponsorUserId
  };
  console.info("[E2E signup-membership]", JSON.stringify(result));
  return result;
}
