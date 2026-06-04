import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import { attachReferralAttribution } from "./signupMembership.js";

const ENTERPRISE_REFERRAL_CODE_FALLBACK_PREFIX = "B2B-ENT";

export class EnterpriseReferralLockedError extends Error {
  constructor(message = "회사 인증 개인 계정은 개인 추천인을 지정할 수 없습니다. 해당 기업의 VLUE 추천인(기업 추천인)으로 자동 귀속됩니다.") {
    super(message);
    this.name = "EnterpriseReferralLockedError";
  }
}

/** 회사 인증·콤보 경로 — 개인 추천인 코드 입력 불가 */
export async function assertPersonalReferralAllowed(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isEnterpriseVerified: true }
  });
  if (user?.isEnterpriseVerified) {
    throw new EnterpriseReferralLockedError();
  }

  const attr = await referralDb.referralAttribution.findUnique({
    where: { userId },
    select: { referralCodeUsed: true }
  });
  const code = String(attr?.referralCodeUsed || "");
  if (code.startsWith(ENTERPRISE_REFERRAL_CODE_FALLBACK_PREFIX) || code.startsWith("B2B-")) {
    throw new EnterpriseReferralLockedError();
  }
}

/**
 * B2BEnterpriseAccount.acquiredByVluerUserId → 개인 계정 레퍼럴 귀속
 * (기업 직원 User FK 없음 — VLUE 스폰서만 기록)
 */
export async function resolveEnterpriseReferralSponsor(enterpriseId: string) {
  const ent = await prisma.b2BEnterpriseAccount.findUnique({
    where: { id: enterpriseId },
    select: {
      companyName: true,
      acquiredByVluerUserId: true,
      acquiredByVluer: {
        select: {
          id: true,
          publicHandle: true,
          legalName: true,
          vluerProfile: { select: { referralCode: true } }
        }
      }
    }
  });
  if (!ent) {
    throw new Error("기업 정보를 찾을 수 없습니다.");
  }

  const sponsorUserId = ent.acquiredByVluerUserId;
  if (!sponsorUserId) {
    throw new Error(
      `「${ent.companyName}」에 등록된 기업 추천인(VLUER)이 없습니다. 기업 가입 시 인수 VLUE를 확인해 주세요.`
    );
  }

  const referralCodeUsed =
    ent.acquiredByVluer?.vluerProfile?.referralCode ||
    `${ENTERPRISE_REFERRAL_CODE_FALLBACK_PREFIX}-${enterpriseId.slice(0, 8).toUpperCase()}`;

  return {
    sponsorUserId,
    referralCodeUsed,
    companyName: ent.companyName,
    sponsorDisplayName:
      ent.acquiredByVluer?.legalName ||
      (ent.acquiredByVluer?.publicHandle ? `@${ent.acquiredByVluer.publicHandle}` : null) ||
      "기업 추천 VLUE"
  };
}

/** 회사 인증 성공 시 호출 — 기존 개인 추천인 선택이 있어도 기업 추천인으로 덮어씀 */
export async function attachEnterpriseReferralAttribution(personalUserId: string, enterpriseId: string) {
  const resolved = await resolveEnterpriseReferralSponsor(enterpriseId);
  if (resolved.sponsorUserId === personalUserId) {
    throw new Error("본인을 기업 추천인으로 지정할 수 없습니다.");
  }

  await attachReferralAttribution(
    personalUserId,
    resolved.sponsorUserId,
    resolved.referralCodeUsed
  );

  return {
    ok: true as const,
    sponsorUserId: resolved.sponsorUserId,
    referralCodeUsed: resolved.referralCodeUsed,
    companyName: resolved.companyName,
    sponsorDisplayName: resolved.sponsorDisplayName,
    enterpriseReferral: true as const
  };
}

export async function getEnterpriseReferralSummaryForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isEnterpriseVerified: true }
  });
  if (!user?.isEnterpriseVerified) {
    return { locked: false as const, sponsor: null };
  }

  const attr = await referralDb.referralAttribution.findUnique({
    where: { userId },
    select: {
      referralCodeUsed: true,
      sponsorVluerUserId: true
    }
  });
  if (!attr?.sponsorVluerUserId) {
    return { locked: true as const, sponsor: null };
  }

  const sponsorUser = await prisma.user.findUnique({
    where: { id: attr.sponsorVluerUserId },
    select: { legalName: true, publicHandle: true }
  });

  return {
    locked: true as const,
    sponsor: {
      userId: attr.sponsorVluerUserId,
      referralCodeUsed: attr.referralCodeUsed,
      displayName:
        sponsorUser?.legalName ||
        (sponsorUser?.publicHandle ? `@${sponsorUser.publicHandle}` : null) ||
        "기업 추천 VLUE"
    }
  };
}
