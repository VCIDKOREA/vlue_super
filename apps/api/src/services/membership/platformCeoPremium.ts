import { createHash } from "node:crypto";
import { prisma } from "../../db/client.js";
import { hashCiUniqueKey } from "../../integrations/portone/iamportCert.js";
import { isPlatformCeoHandle, PLATFORM_CEO_MEMBER } from "../admin/platformAccountRoles.js";
import {
  buildTitleDeptDocUrl,
  getLatestTitleDeptReviewForUser,
  insertTitleDeptReview
} from "../bizcard/titleDeptReviewStore.js";
import { ensurePlatformCeoBroadcastLine } from "./broadcastLineService.js";

/** 시드·로그인 공통 — ceo 전용 CI (실 PASS 대체, 충돌 없는 고정 키) */
export const PLATFORM_CEO_CI_UNIQUE_KEY = "platform:ceo:seed_ceo_premium_v1";

export const PLATFORM_CEO_LEGAL_NAME = "이종근";

/**
 * 로그인 시 멤버십 티어 해석.
 * ceo 는 DB·구독을 Premium(paid)으로 강제 고정 후 반환.
 */
export async function resolveLoginMembershipTier(
  userId: string,
  publicHandle: string | null | undefined
): Promise<string> {
  if (isPlatformCeoHandle(publicHandle)) {
    await ensurePlatformCeoPremium(userId);
    return PLATFORM_CEO_MEMBER.membershipTier;
  }

  const [card, sub] = await Promise.all([
    prisma.digitalCard.findUnique({
      where: { userId },
      select: { membershipTierSnapshot: true }
    }),
    prisma.userSubscription.findFirst({
      where: { userId, status: "active", cycleEndAt: { gt: new Date() } },
      select: { id: true }
    })
  ]);

  const snap = String(card?.membershipTierSnapshot || "").trim().toLowerCase();
  if (snap === "standard" || snap === "premium") return "paid";
  if (snap === "paid" || snap === "b2b" || snap === "free") return snap;
  if (sub) return "paid";
  return "free";
}

/**
 * 대표 개인 계정(ceo) — 유료 + 휴대폰 본인인증·CI·계정 활성·직책 승인·발신번호 인증까지 전부 통과 상태로 고정.
 */
export async function ensurePlatformCeoPremium(userId: string): Promise<void> {
  const now = new Date();
  const cycleEnd = new Date(now);
  cycleEnd.setFullYear(cycleEnd.getFullYear() + 5);
  const ciHash = hashCiUniqueKey(PLATFORM_CEO_CI_UNIQUE_KEY);

  await prisma.user.update({
    where: { id: userId },
    data: {
      identityVerified: true,
      identityVerifiedAt: now,
      accountStatus: "active",
      status: "ACTIVE",
      isVerified: true,
      isCompanyVerified: true,
      companyVerifiedAt: now,
      phoneE164: PLATFORM_CEO_MEMBER.phoneE164,
      email: PLATFORM_CEO_MEMBER.email,
      portoneIdentityId: "seed_ceo_premium_v1",
      ciHash: new Uint8Array(ciHash),
      birthDate: "19700101",
      gender: "M",
      hasActiveShowcase: true,
      pendingApprovalAt: null,
      searchSuspendedAt: null
    }
  });

  await prisma.user.updateMany({
    where: { id: userId, OR: [{ legalName: null }, { legalName: "" }] },
    data: {
      legalName: PLATFORM_CEO_LEGAL_NAME,
      legalNameLockedAt: now
    }
  });

  const existingCard = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { exportSnapshotJson: true }
  });
  const prevSnap =
    existingCard?.exportSnapshotJson && typeof existingCard.exportSnapshotJson === "object"
      ? (existingCard.exportSnapshotJson as Record<string, unknown>)
      : {};
  const nextSnap = {
    ...prevSnap,
    name: String(prevSnap.name || PLATFORM_CEO_LEGAL_NAME).trim() || PLATFORM_CEO_LEGAL_NAME,
    title: String(prevSnap.title || "CEO").trim() || "CEO",
    organization: String(prevSnap.organization || "VCID KOREA").trim() || "VCID KOREA",
    phone: String(prevSnap.phone || PLATFORM_CEO_MEMBER.phoneE164).trim() || PLATFORM_CEO_MEMBER.phoneE164,
    email: String(prevSnap.email || PLATFORM_CEO_MEMBER.email).trim() || PLATFORM_CEO_MEMBER.email,
    handle: PLATFORM_CEO_MEMBER.handle,
    membershipTier: PLATFORM_CEO_MEMBER.membershipTier
  };

  await prisma.digitalCard.upsert({
    where: { userId },
    create: {
      userId,
      membershipTierSnapshot: PLATFORM_CEO_MEMBER.membershipTier,
      exportSnapshotJson: nextSnap
    },
    update: {
      membershipTierSnapshot: PLATFORM_CEO_MEMBER.membershipTier,
      exportSnapshotJson: nextSnap
    }
  });

  await prisma.userBusinessProfile.upsert({
    where: { userId },
    create: {
      userId,
      companyName: "VCID KOREA",
      jobTitle: "CEO"
    },
    update: {
      companyName: "VCID KOREA",
      jobTitle: "CEO"
    }
  }).catch(() => {
    /* model optional / legacy */
  });

  const active = await prisma.userSubscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (active) {
    await prisma.userSubscription.update({
      where: { id: active.id },
      data: {
        plan: "b2c_monthly",
        amountKrw: 9900,
        listPriceKrw: 28300,
        isDiscounted: true,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        portoneCustomerUid: `user_customer_${userId}`
      }
    });
  } else {
    await prisma.userSubscription.create({
      data: {
        userId,
        plan: "b2c_monthly",
        status: "active",
        amountKrw: 9900,
        listPriceKrw: 28300,
        isDiscounted: true,
        cycleStartAt: now,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        portoneCustomerUid: `user_customer_${userId}`
      }
    });
  }

  await ensurePlatformCeoTitleDeptApproved(userId);
  try {
    await ensurePlatformCeoBroadcastLine(userId, PLATFORM_CEO_MEMBER.phoneE164);
  } catch (err) {
    console.warn("[platform-ceo] broadcast line ensure skipped", err);
  }
}

async function ensurePlatformCeoTitleDeptApproved(userId: string): Promise<void> {
  try {
    const latest = await getLatestTitleDeptReviewForUser(userId);
    if (latest && String(latest.review_status || "").toUpperCase() === "APPROVED") {
      if (String(latest.approved_title || "").trim() === "CEO") return;
      await prisma.$executeRawUnsafe(
        `
          UPDATE title_dept_verification_reviews
          SET approved_title = $2,
              approved_department = '',
              review_status = 'APPROVED',
              updated_at = NOW()
          WHERE id = $1::uuid
        `,
        latest.id,
        "CEO"
      );
      return;
    }

    const card = await prisma.digitalCard.findUnique({
      where: { userId },
      select: { id: true }
    });
    const issuedAt = new Date().toISOString().slice(0, 10);
    const reviewId = await insertTitleDeptReview({
      userId,
      digitalCardId: card?.id || null,
      source: "bizcard_settings",
      pendingTitle: "CEO",
      pendingDepartment: "",
      docKind: "business_registration",
      docUrl: buildTitleDeptDocUrl(userId, "business_registration", "ceo-platform-approved.pdf"),
      docFileName: "ceo-platform-approved.pdf",
      docIssuedAt: issuedAt,
      reviewStatus: "APPROVED"
    });
    if (reviewId) {
      await prisma.$executeRawUnsafe(
        `
          UPDATE title_dept_verification_reviews
          SET approved_title = 'CEO',
              approved_department = '',
              pending_title = 'CEO',
              review_status = 'APPROVED',
              updated_at = NOW()
          WHERE id = $1::uuid
        `,
        reviewId
      );
    }
  } catch (err) {
    console.warn("[platform-ceo] title-dept approve skipped", err);
  }
}

/** 시드 스크립트·테스트용 CI 해시(hex) */
export function platformCeoCiHashHex(): string {
  return createHash("sha256").update(PLATFORM_CEO_CI_UNIQUE_KEY, "utf8").digest("hex");
}
