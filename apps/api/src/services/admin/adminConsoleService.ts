import { prisma } from "../../db/client.js";
import { formatPhoneDisplayKR } from "../../lib/phoneDisplay.js";
import { getFcmServerDiagnostics } from "../fcmNotificationService.js";
import { sseConnectionStats, ssePublishAllConnected } from "../../realtime/sseHub.js";
import {
  createMarketingPopup,
  deleteMarketingPopup,
  listMarketingPopups,
  updateMarketingPopup
} from "../office/marketingPopupService.js";
import {
  deleteNotice,
  listNotices,
  releaseNotice,
  updateNotice
} from "../office/noticeService.js";
import {
  getOnboardingStats,
  listManualReviewQueue,
  mapManualReviewRows,
  resolveManualReview
} from "../onboarding/automatedOnboardingService.js";
import {
  batchFamilyPlanPathLabels,
  resolveMembershipPathLabel
} from "../membership/familyPlanMembership.js";
import { ensureAdminAccountActionSchema } from "./ensureAdminAccountActionSchema.js";
import {
  cancelScheduledWithdrawal,
  scheduleAdminWithdrawal,
  withdrawAccountByAdmin
} from "../auth/accountWithdrawalFlowService.js";
import { ensureWithdrawalScheduleSchema } from "../auth/ensureWithdrawalScheduleSchema.js";

const ADMIN_MEMBER_SELECT = {
  id: true,
  publicHandle: true,
  legalName: true,
  email: true,
  phoneE164: true,
  birthDate: true,
  gender: true,
  identityVerified: true,
  identityVerifiedAt: true,
  signupMethod: true,
  isCompanyVerified: true,
  referrerCode: true,
  role: true,
  accountStatus: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  termsAcceptedAt: true,
  pendingApprovalAt: true,
  withdrawalScheduledAt: true,
  withdrawalRequestedAt: true,
  withdrawalMethod: true,
  accountActionReason: true,
  accountActionAt: true,
  accountActionBy: true,
  accountActionType: true,
  businessProfile: {
    select: {
      isBusiness: true,
      companyName: true,
      jobTitle: true,
      businessRegistrationNo: true
    }
  },
  digitalCard: {
    select: {
      membershipTierSnapshot: true,
      issuedAt: true
    }
  }
} as const;

function formatBirthDisplay(raw: string | null | undefined): string {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length !== 8) return "";
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}

function formatGenderDisplay(raw: string | null | undefined): string {
  if (raw === "M") return "남";
  if (raw === "F") return "여";
  return "";
}

function serializeAdminMember(
  u: {
  id: string;
  publicHandle: string | null;
  legalName: string | null;
  email: string | null;
  phoneE164: string | null;
  birthDate: string | null;
  gender: string | null;
  identityVerified: boolean;
  identityVerifiedAt: Date | null;
  signupMethod: string;
  isCompanyVerified: boolean;
  referrerCode: string | null;
  role: string;
  accountStatus: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  termsAcceptedAt: Date | null;
  pendingApprovalAt: Date | null;
  withdrawalScheduledAt?: Date | null;
  withdrawalRequestedAt?: Date | null;
  withdrawalMethod?: string | null;
  accountActionReason?: string | null;
  accountActionAt?: Date | null;
  accountActionBy?: string | null;
  accountActionType?: string | null;
  businessProfile: {
    isBusiness: boolean;
    companyName: string | null;
    jobTitle: string | null;
    businessRegistrationNo: string | null;
  } | null;
  digitalCard: {
    membershipTierSnapshot: string | null;
    issuedAt: Date;
  } | null;
},
  opts?: { membershipPathLabel?: string }
) {
  const phone = u.phoneE164 || "";
  const membershipTier = String(u.digitalCard?.membershipTierSnapshot || "free").toLowerCase();
  const pendingWithdrawal =
    Boolean(u.withdrawalScheduledAt) && String(u.status || "") !== "DELETED";
  const recoverableUntil = pendingWithdrawal && u.withdrawalScheduledAt
    ? u.withdrawalScheduledAt.toISOString()
    : null;
  return {
    id: u.id,
    publicHandle: u.publicHandle || "",
    legalName: u.legalName || "",
    email: u.email || "",
    phoneE164: phone,
    phoneDisplay: phone ? formatPhoneDisplayKR(phone) : "",
    birthDate: u.birthDate || "",
    birthDisplay: formatBirthDisplay(u.birthDate),
    gender: u.gender || "",
    genderDisplay: formatGenderDisplay(u.gender),
    identityVerified: Boolean(u.identityVerified),
    identityVerifiedAt: u.identityVerifiedAt ? u.identityVerifiedAt.toISOString() : null,
    signupMethod: u.signupMethod || "",
    isCompanyVerified: Boolean(u.isCompanyVerified),
    referrerCode: u.referrerCode || "",
    role: u.role,
    accountStatus: u.accountStatus,
    status: u.status,
    membershipTier,
    membershipPathLabel: opts?.membershipPathLabel || membershipTier,
    digitalCardIssued: Boolean(u.digitalCard),
    companyName: u.businessProfile?.companyName || "",
    jobTitle: u.businessProfile?.jobTitle || "",
    businessRegistrationNo: u.businessProfile?.businessRegistrationNo || "",
    isBusiness: Boolean(u.businessProfile?.isBusiness),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    termsAcceptedAt: u.termsAcceptedAt ? u.termsAcceptedAt.toISOString() : null,
    pendingApprovalAt: u.pendingApprovalAt ? u.pendingApprovalAt.toISOString() : null,
    pendingWithdrawal,
    withdrawalScheduledAt: u.withdrawalScheduledAt ? u.withdrawalScheduledAt.toISOString() : null,
    withdrawalRequestedAt: u.withdrawalRequestedAt ? u.withdrawalRequestedAt.toISOString() : null,
    withdrawalMethod: u.withdrawalMethod || "",
    recoverableUntil,
    accountActionReason: u.accountActionReason || "",
    accountActionAt: u.accountActionAt ? u.accountActionAt.toISOString() : null,
    accountActionBy: u.accountActionBy || "",
    accountActionType: u.accountActionType || ""
  };
}

export async function listAdminUsers(opts: { q?: string; limit?: number; offset?: number }) {
  await ensureWithdrawalScheduleSchema();
  await ensureAdminAccountActionSchema();
  const q = String(opts.q || "").trim();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const where = q
    ? {
        OR: [
          { publicHandle: { contains: q, mode: "insensitive" as const } },
          { legalName: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phoneE164: { contains: q } },
          { businessProfile: { companyName: { contains: q, mode: "insensitive" as const } } }
        ]
      }
    : {};

  const [usersRaw, total] = await Promise.all([
    prisma.user.findMany({
      where,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: ADMIN_MEMBER_SELECT as any,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.user.count({ where })
  ]);
  const users = usersRaw as unknown as Array<{
    id: string;
    digitalCard?: { membershipTierSnapshot?: string | null } | null;
    [key: string]: unknown;
  }>;

  const freeWardIds = users
    .filter((u) => {
      const t = String(u.digitalCard?.membershipTierSnapshot || "free").toLowerCase();
      return t === "free" || !t;
    })
    .map((u) => u.id);
  const familyPathMap = await batchFamilyPlanPathLabels(freeWardIds);

  return {
    users: users.map((u) => {
      const tier = String(u.digitalCard?.membershipTierSnapshot || "free").toLowerCase();
      const familyPath = familyPathMap.get(u.id);
      const pathLabel =
        familyPath ||
        (tier === "paid" || tier === "standard" || tier === "premium"
          ? "유료"
          : tier === "b2b"
            ? "B2B"
            : "무료");
      return serializeAdminMember(u as Parameters<typeof serializeAdminMember>[0], {
        membershipPathLabel: pathLabel
      });
    }),
    total,
    limit,
    offset
  };
}

export async function getAdminUser(userId: string) {
  await ensureWithdrawalScheduleSchema();
  await ensureAdminAccountActionSchema();
  const userRaw = await prisma.user.findUnique({
    where: { id: userId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: ADMIN_MEMBER_SELECT as any
  });
  if (!userRaw) return null;
  const user = userRaw as unknown as {
    id: string;
    digitalCard?: { membershipTierSnapshot?: string | null } | null;
    [key: string]: unknown;
  };
  const tier = String(user.digitalCard?.membershipTierSnapshot || "free").toLowerCase();
  const pathLabel = await resolveMembershipPathLabel(userId, tier);
  return serializeAdminMember(user as Parameters<typeof serializeAdminMember>[0], {
    membershipPathLabel: pathLabel
  });
}

export async function patchAdminUser(
  userId: string,
  patch: { accountStatus?: string; status?: string; role?: string; legalName?: string }
) {
  const data: Record<string, unknown> = {};
  if (patch.accountStatus) {
    const allowed = ["pending_identity", "pending_approval", "active", "suspended"];
    if (!allowed.includes(patch.accountStatus)) throw new Error("유효하지 않은 accountStatus");
    data.accountStatus = patch.accountStatus;
  }
  if (patch.status) {
    const allowed = ["ACTIVE", "INACTIVE", "DELETED"];
    if (!allowed.includes(patch.status)) throw new Error("유효하지 않은 status");
    data.status = patch.status;
  }
  if (patch.role) {
    if (!["user", "admin"].includes(patch.role)) throw new Error("유효하지 않은 role");
    data.role = patch.role;
  }
  if (patch.legalName !== undefined) {
    data.legalName = String(patch.legalName || "").trim().slice(0, 120) || null;
  }
  if (!Object.keys(data).length) throw new Error("변경할 필드가 없습니다.");

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      publicHandle: true,
      legalName: true,
      role: true,
      accountStatus: true,
      status: true
    }
  });
  return user;
}

function requireReason(raw: unknown): string {
  const reason = String(raw || "").trim();
  if (reason.length < 2) throw new Error("사유를 입력해 주세요. (2자 이상)");
  if (reason.length > 500) throw new Error("사유는 500자 이내로 입력해 주세요.");
  return reason;
}

async function writeAccountActionMeta(
  userId: string,
  opts: { type: string; reason: string; adminUserId: string }
) {
  await ensureAdminAccountActionSchema();
  const reason = opts.reason.slice(0, 500);
  const adminId = String(opts.adminUserId || "").slice(0, 64);
  const type = String(opts.type || "").slice(0, 32);
  await prisma.$executeRawUnsafe(
    `UPDATE users
     SET account_action_reason = $1,
         account_action_at = NOW(),
         account_action_by = $2,
         account_action_type = $3
     WHERE id = $4::uuid`,
    reason,
    adminId || null,
    type,
    userId
  );
}

export async function adminSuspendUser(
  userId: string,
  opts: { reason: string; adminUserId: string }
) {
  const reason = requireReason(opts.reason);
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true }
  });
  if (!existing) throw new Error("회원을 찾을 수 없습니다.");
  if (existing.status === "DELETED") throw new Error("이미 탈퇴된 계정입니다.");
  if (existing.role === "admin") throw new Error("관리자 계정은 정지할 수 없습니다.");

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: "suspended" }
  });
  await writeAccountActionMeta(userId, {
    type: "suspend",
    reason,
    adminUserId: opts.adminUserId
  });
  return getAdminUser(userId);
}

export async function adminActivateUser(
  userId: string,
  opts: { reason?: string; adminUserId: string }
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, withdrawalScheduledAt: true }
  });
  if (!existing) throw new Error("회원을 찾을 수 없습니다.");
  if (existing.status === "DELETED") throw new Error("탈퇴 완료 계정은 활성화할 수 없습니다.");
  if (existing.withdrawalScheduledAt) {
    throw new Error("탈퇴 예정 계정입니다. 「복구」로 탈퇴 예약을 먼저 취소해 주세요.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: "active", status: "ACTIVE" }
  });
  const reason = String(opts.reason || "").trim() || "관리자 활성화";
  await writeAccountActionMeta(userId, {
    type: "activate",
    reason,
    adminUserId: opts.adminUserId
  });
  return getAdminUser(userId);
}

export async function adminWithdrawUser(
  userId: string,
  opts: { reason: string; adminUserId: string; mode?: "grace" | "immediate" }
) {
  const reason = requireReason(opts.reason);
  const mode = opts.mode === "immediate" ? "immediate" : "grace";
  await ensureAdminAccountActionSchema();

  if (mode === "immediate") {
    await withdrawAccountByAdmin(userId);
    await writeAccountActionMeta(userId, {
      type: "withdraw_immediate",
      reason,
      adminUserId: opts.adminUserId
    });
    return {
      ok: true,
      immediate: true,
      user: await getAdminUser(userId),
      message: "즉시 탈퇴 처리되었습니다. 개인정보는 파기되어 복구할 수 없습니다."
    };
  }

  const scheduled = await scheduleAdminWithdrawal(userId);
  await writeAccountActionMeta(userId, {
    type: "withdraw_grace",
    reason,
    adminUserId: opts.adminUserId
  });
  /* 유예 기간 동안은 로그인·이용을 막아 두기 위해 정지도 병행 */
  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: "suspended" }
  });
  return {
    ...scheduled,
    ok: true,
    immediate: false,
    user: await getAdminUser(userId),
    message: `탈퇴 예약되었습니다. ${scheduled.recoverableUntil?.slice(0, 16).replace("T", " ")}까지 복구 가능합니다.`
  };
}

export async function adminRestoreUser(
  userId: string,
  opts: { reason?: string; adminUserId: string }
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      accountStatus: true,
      withdrawalScheduledAt: true
    }
  });
  if (!existing) throw new Error("회원을 찾을 수 없습니다.");
  if (existing.status === "DELETED") {
    throw new Error("탈퇴가 완료된 계정은 복구할 수 없습니다.");
  }

  let cancelledWithdrawal = false;
  if (existing.withdrawalScheduledAt) {
    await cancelScheduledWithdrawal(userId);
    cancelledWithdrawal = true;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: "active", status: "ACTIVE" }
  });

  const reason =
    String(opts.reason || "").trim() ||
    (cancelledWithdrawal ? "탈퇴 예약 취소·복구" : "정지 해제·복구");
  await writeAccountActionMeta(userId, {
    type: cancelledWithdrawal ? "restore_withdrawal" : "restore_suspend",
    reason,
    adminUserId: opts.adminUserId
  });

  return {
    ok: true,
    cancelledWithdrawal,
    user: await getAdminUser(userId),
    message: cancelledWithdrawal
      ? "탈퇴 예약을 취소하고 계정을 복구했습니다."
      : "정지 상태를 해제하고 활성화했습니다."
  };
}

export async function listAdminFeedPosts(limit = 50) {
  const posts = await prisma.cardFeedPost.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      cardId: true,
      authorUserId: true,
      title: true,
      body: true,
      createdAt: true,
      author: { select: { publicHandle: true, legalName: true } },
      card: { select: { displayName: true } }
    }
  });
  return posts.map((p) => ({
    id: p.id,
    type: "feed",
    cardId: p.cardId,
    cardName: p.card?.displayName || "",
    authorUserId: p.authorUserId,
    authorHandle: p.author?.publicHandle || "",
    authorName: p.author?.legalName || "",
    title: p.title || "",
    bodyPreview: p.body.slice(0, 160),
    createdAt: p.createdAt.toISOString()
  }));
}

export async function deleteAdminFeedPost(postId: string) {
  const result = await prisma.cardFeedPost.deleteMany({ where: { id: postId } });
  return result.count > 0;
}

export async function listAdminMediaCampaigns(limit = 50) {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: string; user_id: string; shop_id: string; title: string; status: string; created_at: Date }[]
    >(
      `
        SELECT id, user_id, shop_id, title, status, created_at
        FROM shop_media_campaigns
        ORDER BY created_at DESC
        LIMIT $1;
      `,
      limit
    );
    return rows.map((r) => ({
      id: r.id,
      type: "media_campaign",
      userId: r.user_id,
      shopId: r.shop_id,
      title: r.title,
      status: r.status,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
    }));
  } catch {
    return [];
  }
}

export async function getAdminHealthStatus() {
  const checks: { id: string; label: string; ok: boolean; detail?: string }[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ id: "database", label: "PostgreSQL", ok: true, detail: "connected" });
  } catch (e) {
    checks.push({
      id: "database",
      label: "PostgreSQL",
      ok: false,
      detail: e instanceof Error ? e.message : "connection failed"
    });
  }

  const sse = sseConnectionStats();
  checks.push({
    id: "sse",
    label: "실시간 SSE",
    ok: true,
    detail: `${sse.users} users · ${sse.connections} connections`
  });

  const fcmDiag = await getFcmServerDiagnostics();
  checks.push({
    id: "fcm",
    label: "푸시(FCM)",
    ok: fcmDiag.ready,
    detail: fcmDiag.ready
      ? "Firebase Admin 연결됨"
      : fcmDiag.detail || fcmDiag.reason
  });

  const scannerOk = Boolean(process.env.PORTONE_API_KEY || process.env.IAMPORT_IMP_CODE);
  checks.push({
    id: "scanner",
    label: "스캐너/결제(Portone)",
    ok: scannerOk,
    detail: scannerOk ? "API key present" : "env missing"
  });

  const jwtOk = Boolean(process.env.JWT_ACCESS_SECRET);
  checks.push({
    id: "jwt",
    label: "JWT 시크릿",
    ok: jwtOk,
    detail: jwtOk ? "set" : "using dev fallback"
  });

  return {
    ok: checks.every((c) => c.id === "fcm" || c.id === "scanner" ? true : c.ok),
    checks,
    time: new Date().toISOString()
  };
}

export async function testAdminNotificationBroadcast(message: string) {
  const delivered = ssePublishAllConnected({
    type: "vlue-admin-health-test",
    message: message || "관리자 점검 테스트 알림"
  });
  return { deliveredConnections: delivered };
}

export {
  listNotices,
  releaseNotice,
  updateNotice,
  deleteNotice,
  listMarketingPopups,
  createMarketingPopup,
  updateMarketingPopup,
  deleteMarketingPopup,
  getOnboardingStats,
  listManualReviewQueue,
  mapManualReviewRows,
  resolveManualReview
};
