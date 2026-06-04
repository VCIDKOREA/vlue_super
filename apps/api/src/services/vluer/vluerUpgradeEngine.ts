import { prisma } from "../../db/client.js";
import {
  PAID_LIST_PRICE_ANNUAL_KRW,
  PAID_LIST_PRICE_MONTHLY_KRW
} from "../membership/membershipBmConstants.js";
import { countPaidDirectReferrals } from "./paidReferralCount.js";
import type { UpgradeTargetGrade, VluerGrade } from "./vluerGradeTypes.js";
import {
  VLUE_GRADE_LABELS,
  VLUE_GRADE_THRESHOLDS
} from "./vluerGradeConstants.js";

export type VluerUpgradeEligibility = {
  currentGrade: VluerGrade;
  currentGradeLabel: string;
  paidReferralCount: number;
  certified: {
    available: boolean;
    reason: string | null;
  };
  partner: {
    available: boolean;
    reason: string | null;
  };
  priceChangeNotice: string;
  certifiedRewardNotice: string;
  partnerRewardNotice: string;
};

function priceChangeNotice(): string {
  return "기존 할인이 종료되며 정가 28,300원으로 전환되고, 리워드 요율이 상향됩니다.";
}

export async function buildVluerUpgradeEligibility(userId: string): Promise<VluerUpgradeEligibility> {
  const profile = await prisma.userVluerProfile.upsert({
    where: { userId },
    create: { userId, vluerGrade: "general", tierCode: "general" },
    update: {}
  });

  const grade = (profile.vluerGrade || profile.tierCode || "general") as VluerGrade;
  const paidCount = await countPaidDirectReferrals(userId);

  const certifiedAvailable =
    grade === "general" &&
    paidCount >= VLUE_GRADE_THRESHOLDS.certifiedMinPaidReferrals &&
    paidCount <= VLUE_GRADE_THRESHOLDS.certifiedMaxPaidReferrals;

  const partnerAvailable =
    (grade === "general" || grade === "certified") &&
    paidCount >= VLUE_GRADE_THRESHOLDS.partnerMinPaidReferrals;

  let certifiedReason: string | null = null;
  if (grade !== "general") {
    certifiedReason = "이미 상위 VLUER 업그레이드가 적용되어 있습니다.";
  } else if (paidCount < VLUE_GRADE_THRESHOLDS.certifiedMinPaidReferrals) {
    certifiedReason = "VLUER 업그레이드 조건을 아직 충족하지 않았습니다.";
  } else if (paidCount > VLUE_GRADE_THRESHOLDS.certifiedMaxPaidReferrals) {
    certifiedReason = "파트너 VLUER 업그레이드 경로를 이용해 주세요.";
  }

  let partnerReason: string | null = null;
  if (grade === "partner" || grade === "official") {
    partnerReason = "이미 최상위 VLUER 등급입니다.";
  } else if (paidCount < VLUE_GRADE_THRESHOLDS.partnerMinPaidReferrals) {
    partnerReason = "VLUER 업그레이드 조건을 아직 충족하지 않았습니다.";
  }

  return {
    currentGrade: grade,
    currentGradeLabel: VLUE_GRADE_LABELS[grade],
    paidReferralCount: paidCount,
    certified: { available: certifiedAvailable, reason: certifiedReason },
    partner: { available: partnerAvailable, reason: partnerReason },
    priceChangeNotice: priceChangeNotice(),
    certifiedRewardNotice:
      "정가 28,300원으로 전환되며, 리워드 요율이 10% 캐시 적립으로 상승합니다.",
    partnerRewardNotice:
      "정가 28,300원으로 전환되며, 리워드 요율이 15% 캐시 적립으로 상승합니다."
  };
}

async function forceListPriceSubscription(userId: string) {
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" }
  });
  if (!sub) return;
  const listAmount =
    sub.plan === "b2c_annual" ? PAID_LIST_PRICE_ANNUAL_KRW : PAID_LIST_PRICE_MONTHLY_KRW;
  await prisma.userSubscription.update({
    where: { id: sub.id },
    data: {
      isDiscounted: false,
      isDiscountedNextCycle: false,
      amountKrw: listAmount,
      listPriceKrw: listAmount
    }
  });
}

export async function upgradeVluerGrade(
  userId: string,
  target: UpgradeTargetGrade,
  opts?: { confirmPriceChange?: boolean }
) {
  if (!opts?.confirmPriceChange) {
    throw new Error("정가 전환 및 요율 변경 안내에 동의해 주세요.");
  }

  const paidCount = await countPaidDirectReferrals(userId);
  const profile = await prisma.userVluerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("VLUER 프로필이 없습니다.");

  const current = (profile.vluerGrade || profile.tierCode || "general") as VluerGrade;

  if (target === "certified") {
    if (current !== "general") {
      throw new Error("인증 VLUER 업그레이드는 일반 VLUER에서만 가능합니다.");
    }
    if (paidCount < VLUE_GRADE_THRESHOLDS.certifiedMinPaidReferrals) {
      throw new Error("VLUER 업그레이드 조건을 충족하지 않습니다.");
    }
    if (paidCount > VLUE_GRADE_THRESHOLDS.certifiedMaxPaidReferrals) {
      throw new Error("파트너 VLUER 업그레이드 조건에 해당합니다.");
    }
  }

  if (target === "partner") {
    if (current !== "general" && current !== "certified") {
      throw new Error("파트너 VLUER 업그레이드는 일반·인증 VLUER에서 가능합니다.");
    }
    if (paidCount < VLUE_GRADE_THRESHOLDS.partnerMinPaidReferrals) {
      throw new Error("VLUER 업그레이드 조건을 충족하지 않습니다.");
    }
  }

  await prisma.userVluerProfile.update({
    where: { userId },
    data: {
      vluerGrade: target,
      tierCode: target,
      activityTier: null
    }
  });

  await forceListPriceSubscription(userId);

  return {
    upgraded: true,
    vluerGrade: target,
    vluerGradeLabel: VLUE_GRADE_LABELS[target],
    listPriceApplied: true,
    paidReferralCount: paidCount
  };
}
