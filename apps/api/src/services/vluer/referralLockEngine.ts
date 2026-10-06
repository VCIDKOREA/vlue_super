import { referralDb } from "../../db/referralDb.js";

const LOCK_MONTHS = 3;

export function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

export async function ensureReferralAttribution(
  userId: string,
  sponsorVluerUserId: string | null,
  referralCodeUsed?: string | null
) {
  const existing = await referralDb.referralAttribution.findUnique({ where: { userId } });
  if (existing) return existing;

  const now = new Date();
  return referralDb.referralAttribution.create({
    data: {
      userId,
      sponsorVluerUserId,
      referralCodeUsed: referralCodeUsed?.trim() || null,
      attributedAt: now,
      /* 가입 시점 고정 — 이후 추천인 변경 불가 (legacy lock 컬럼 유지) */
      codeChangeLockedUntil: addMonths(now, LOCK_MONTHS)
    }
  });
}

export async function getActivePenaltyForPayer(payerUserId: string) {
  const now = new Date();
  return referralDb.vluerReferralPenalty.findFirst({
    where: {
      memberUserId: payerUserId,
      isActive: true,
      endsAt: { gt: now }
    }
  });
}

/** 페널티 기간 매출 커미션 → 플랫폼 귀속 */
export function platformRetainedCommissionResult(grossPaymentKrw: number) {
  return {
    commissionKrw: 0,
    blockedReason: "platform_retained_revenue" as const,
    platformRetainedKrw: grossPaymentKrw,
    pgFeeKrw: 0
  };
}
