import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import { PREMIUM_LIST_PRICE_KRW } from "./pricingConstants.js";

const LOCK_MONTHS = 3;
const PENALTY_MONTHS = 6;

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
      codeChangeLockedUntil: addMonths(now, LOCK_MONTHS)
    }
  });
}

/** 가입 3개월 미만이면 코드 변경 불가 */
export async function assertCodeChangeAllowed(memberUserId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const member = await prisma.user.findUnique({
    where: { id: memberUserId },
    select: { isEnterpriseVerified: true }
  });
  if (member?.isEnterpriseVerified) {
    return {
      ok: false,
      error: "회사 인증 개인 계정은 추천인을 변경할 수 없습니다. 기업 추천인으로 고정 귀속됩니다."
    };
  }

  const attr = await referralDb.referralAttribution.findUnique({ where: { userId: memberUserId } });
  if (!attr) {
    return { ok: false, error: "레퍼럴 귀속 정보가 없습니다. 고객센터에 문의해 주세요." };
  }
  const now = new Date();
  if (now < attr.codeChangeLockedUntil) {
    const daysLeft = Math.ceil((attr.codeChangeLockedUntil.getTime() - now.getTime()) / 86_400_000);
    return {
      ok: false,
      error: `가입 후 3개월 락이 적용 중입니다. (${daysLeft}일 후 변경 가능)`
    };
  }
  const pending = await referralDb.vluerCodeChangeRequest.findFirst({
    where: { memberUserId, status: "pending" }
  });
  if (pending) {
    return { ok: false, error: "이미 처리 대기 중인 코드 변경 신청이 있습니다." };
  }
  return { ok: true };
}

export async function createCodeChangeRequest(
  memberUserId: string,
  requestedReferralCode: string
) {
  const gate = await assertCodeChangeAllowed(memberUserId);
  if (!gate.ok) throw new Error(gate.error);

  const attr = await referralDb.referralAttribution.findUnique({ where: { userId: memberUserId } });
  const code = String(requestedReferralCode || "").trim().toUpperCase();
  if (!code) throw new Error("변경할 추천 코드를 입력해 주세요.");

  const target = await prisma.userVluerProfile.findFirst({
    where: { referralCode: code },
    select: { userId: true }
  });
  if (!target) throw new Error("해당 추천 코드를 찾을 수 없습니다.");
  if (target.userId === memberUserId) throw new Error("본인 코드로는 변경할 수 없습니다.");

  return referralDb.vluerCodeChangeRequest.create({
    data: {
      memberUserId,
      currentSponsorUserId: attr?.sponsorVluerUserId ?? null,
      requestedReferralCode: code,
      status: "pending"
    }
  });
}

/** 승인 시 6개월 정가 페널티 + 스폰서 변경 */
export async function approveCodeChangeRequest(requestId: string) {
  const req = await referralDb.vluerCodeChangeRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "pending") throw new Error("처리할 수 없는 신청입니다.");

  const target = await prisma.userVluerProfile.findFirst({
    where: { referralCode: req.requestedReferralCode },
    select: { userId: true }
  });
  if (!target) throw new Error("대상 추천 코드가 유효하지 않습니다.");

  const now = new Date();
  const endsAt = addMonths(now, PENALTY_MONTHS);

  await prisma.$transaction([
    referralDb.vluerCodeChangeRequest.update({
      where: { id: requestId },
      data: { status: "approved" }
    }),
    referralDb.referralAttribution.update({
      where: { userId: req.memberUserId },
      data: {
        sponsorVluerUserId: target.userId,
        referralCodeUsed: req.requestedReferralCode
      }
    }),
    referralDb.vluerReferralPenalty.create({
      data: {
        memberUserId: req.memberUserId,
        sponsorUserId: req.currentSponsorUserId,
        codeChangeRequestId: requestId,
        startedAt: now,
        endsAt,
        monthlyFullPriceKrw: PREMIUM_LIST_PRICE_KRW,
        isActive: true
      }
    })
  ]);

  return { penaltyEndsAt: endsAt, monthlyFullPriceKrw: PREMIUM_LIST_PRICE_KRW };
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
