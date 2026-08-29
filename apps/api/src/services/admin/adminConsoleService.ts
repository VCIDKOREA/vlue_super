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

function serializeAdminMember(u: {
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
}) {
  const phone = u.phoneE164 || "";
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
    membershipTier: String(u.digitalCard?.membershipTierSnapshot || "free").toLowerCase(),
    digitalCardIssued: Boolean(u.digitalCard),
    companyName: u.businessProfile?.companyName || "",
    jobTitle: u.businessProfile?.jobTitle || "",
    businessRegistrationNo: u.businessProfile?.businessRegistrationNo || "",
    isBusiness: Boolean(u.businessProfile?.isBusiness),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    termsAcceptedAt: u.termsAcceptedAt ? u.termsAcceptedAt.toISOString() : null,
    pendingApprovalAt: u.pendingApprovalAt ? u.pendingApprovalAt.toISOString() : null
  };
}

export async function listAdminUsers(opts: { q?: string; limit?: number; offset?: number }) {
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

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: ADMIN_MEMBER_SELECT,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.user.count({ where })
  ]);

  return {
    users: users.map(serializeAdminMember),
    total,
    limit,
    offset
  };
}

export async function getAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: ADMIN_MEMBER_SELECT
  });
  if (!user) return null;
  return serializeAdminMember(user);
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
