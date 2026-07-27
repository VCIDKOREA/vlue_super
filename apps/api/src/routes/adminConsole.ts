import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { verifyPassword } from "../lib/passwordHash.js";
import { requireAdminConsoleBearer, type AdminConsoleUserVar } from "../middleware/adminConsoleGate.js";
import {
  isAdminConsoleUser,
  resolveAdminConsoleRole
} from "../services/admin/adminConsoleAuth.js";
import { denyAdminAccessReasonForUser } from "../services/admin/superAdminAuth.js";
import {
  listMasterCapabilities,
  PLATFORM_MASTER_ADMIN
} from "../services/admin/platformAccountRoles.js";
import { issueTokenPair } from "../services/authSessions.js";
import { adminPricingConfigRoutes } from "./pricingConfig.js";
import { enterpriseDccAdminRoutes } from "./enterpriseDcc.js";
import {
  getAdminProductMetrics
} from "../services/admin/adminProductMetrics.js";
import {
  createMarketingPopup,
  deleteAdminFeedPost,
  deleteMarketingPopup,
  deleteNotice,
  getAdminHealthStatus,
  getOnboardingStats,
  listAdminFeedPosts,
  listAdminMediaCampaigns,
  listAdminUsers,
  listManualReviewQueue,
  listMarketingPopups,
  listNotices,
  mapManualReviewRows,
  patchAdminUser,
  releaseNotice,
  resolveManualReview,
  testAdminNotificationBroadcast,
  updateMarketingPopup,
  updateNotice
} from "../services/admin/adminConsoleService.js";

type AdminConsoleVars = { adminConsoleUser: AdminConsoleUserVar };

export const adminConsoleRoutes = new Hono<{ Variables: AdminConsoleVars }>();

/** POST /api/admin/console/login */
adminConsoleRoutes.post("/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { loginId?: string; password?: string };
  const loginId = String(body.loginId || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  const password = String(body.password || "");
  if (!loginId || !password) return c.json({ error: "아이디와 비밀번호를 입력해 주세요." }, 400);

  const user = await prisma.user.findFirst({
    where: { publicHandle: loginId },
    select: {
      id: true,
      legalName: true,
      publicHandle: true,
      passwordHash: true,
      role: true,
      phoneE164: true,
      accountStatus: true,
      status: true
    }
  });

  if (!user?.passwordHash) return c.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return c.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);

  const ceoDeny = denyAdminAccessReasonForUser(user);
  if (ceoDeny) return c.json({ error: ceoDeny, code: "CEO_NOT_SYSTEM_ADMIN" }, 403);

  if (!isAdminConsoleUser(user)) {
    return c.json({ error: "관리자 권한이 없습니다. 마스터 관리자(admin) 계정만 접근할 수 있습니다." }, 403);
  }

  const pair = await issueTokenPair(user.id, { header: (n) => c.req.header(n) });
  const role = resolveAdminConsoleRole(user);
  return c.json({
    ok: true,
    role,
    accountKind: PLATFORM_MASTER_ADMIN.accountKind,
    capabilities: listMasterCapabilities(user),
    userId: user.id,
    legalName: user.legalName || "",
    publicHandle: user.publicHandle || loginId,
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    accessExpiresInSec: pair.accessExpiresInSec
  });
});

adminConsoleRoutes.use("/me", requireAdminConsoleBearer);
adminConsoleRoutes.get("/me", async (c) => {
  const user = c.get("adminConsoleUser");
  return c.json({
    ok: true,
    role: resolveAdminConsoleRole(user),
    accountKind: PLATFORM_MASTER_ADMIN.accountKind,
    capabilities: listMasterCapabilities(user),
    userId: user.id,
    legalName: user.legalName || "",
    publicHandle: user.publicHandle || ""
  });
});

const authed = new Hono<{ Variables: AdminConsoleVars }>();
authed.use("*", requireAdminConsoleBearer);

authed.get("/users", async (c) => {
  const q = c.req.query("q") || "";
  const limit = Number(c.req.query("limit") || 50);
  const offset = Number(c.req.query("offset") || 0);
  const data = await listAdminUsers({ q, limit, offset });
  return c.json({ ok: true, ...data });
});

authed.patch("/users/:userId", async (c) => {
  const userId = c.req.param("userId");
  const body = (await c.req.json().catch(() => ({}))) as {
    accountStatus?: string;
    status?: string;
    role?: string;
    legalName?: string;
  };
  try {
    const user = await patchAdminUser(userId, body);
    return c.json({ ok: true, user });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "수정 실패" }, 400);
  }
});

authed.get("/posts", async (c) => {
  const [notices, popups, feedPosts, mediaCampaigns] = await Promise.all([
    listNotices(50),
    listMarketingPopups(50),
    listAdminFeedPosts(50),
    listAdminMediaCampaigns(50)
  ]);
  return c.json({ ok: true, notices, popups, feedPosts, mediaCampaigns });
});

authed.post("/posts/notices", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    highlightText?: string;
    bodyText?: string;
  };
  const title = String(body.title || "").trim();
  const bodyText = String(body.bodyText || "").trim();
  if (!title || !bodyText) return c.json({ error: "title, bodyText 필요" }, 400);
  const admin = c.get("adminConsoleUser");
  const result = await releaseNotice({
    title,
    highlightText: String(body.highlightText || "").trim() || undefined,
    bodyText,
    adminDeviceId: undefined
  });
  return c.json({ ok: true, ...result, createdBy: admin.id });
});

authed.patch("/posts/notices/:id", async (c) => {
  const notice = await updateNotice(c.req.param("id"), await c.req.json().catch(() => ({})));
  if (!notice) return c.json({ error: "공지 없음" }, 404);
  return c.json({ ok: true, notice });
});

authed.delete("/posts/notices/:id", async (c) => {
  const ok = await deleteNotice(c.req.param("id"));
  if (!ok) return c.json({ error: "공지 없음" }, 404);
  return c.json({ ok: true });
});

authed.post("/posts/popups", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, string>;
  const imageUrl = String(body.imageUrl || body.imageDataUrl || "").trim();
  if (!imageUrl || !body.startsAt || !body.endsAt) {
    return c.json({ error: "imageUrl, startsAt, endsAt 필요" }, 400);
  }
  const popup = await createMarketingPopup({
    title: String(body.title || "VLUE 마케팅").trim(),
    imageUrl,
    linkUrl: String(body.linkUrl || "").trim() || undefined,
    linkType: body.linkType === "internal" ? "internal" : "external",
    startsAt: body.startsAt,
    endsAt: body.endsAt
  });
  return c.json({ ok: true, popup });
});

authed.patch("/posts/popups/:id", async (c) => {
  const popup = await updateMarketingPopup(c.req.param("id"), await c.req.json().catch(() => ({})));
  if (!popup) return c.json({ error: "팝업 없음" }, 404);
  return c.json({ ok: true, popup });
});

authed.delete("/posts/popups/:id", async (c) => {
  const ok = await deleteMarketingPopup(c.req.param("id"));
  if (!ok) return c.json({ error: "팝업 없음" }, 404);
  return c.json({ ok: true });
});

authed.delete("/posts/feed/:id", async (c) => {
  const ok = await deleteAdminFeedPost(c.req.param("id"));
  if (!ok) return c.json({ error: "게시물 없음" }, 404);
  return c.json({ ok: true });
});

authed.get("/onboarding/stats", async (c) => {
  const stats = await getOnboardingStats();
  return c.json({ ok: true, stats });
});

/** GET /api/admin/console/metrics — DB 지표 차트용 시계열 */
authed.get("/metrics", async (c) => {
  const from = c.req.query("from") || undefined;
  const to = c.req.query("to") || undefined;
  try {
    const data = await getAdminProductMetrics({ from, to });
    return c.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "metrics_failed";
    return c.json({ error: msg }, 500);
  }
});

authed.get("/onboarding/manual-review", async (c) => {
  const rows = await listManualReviewQueue(100);
  return c.json({ ok: true, requests: mapManualReviewRows(rows) });
});

authed.post("/onboarding/manual-review/:id/resolve", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { action?: string; adminNote?: string };
  const action = body.action === "reject" ? "reject" : "approve";
  const admin = c.get("adminConsoleUser");
  try {
    const result = await resolveManualReview({
      reviewId: c.req.param("id"),
      action,
      adminDeviceId: admin.id,
      adminNote: body.adminNote
    });
    return c.json({ ok: true, action, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return c.json({ error: msg }, msg === "REVIEW_NOT_FOUND" ? 404 : 400);
  }
});

authed.get("/health", async (c) => {
  const status = await getAdminHealthStatus();
  return c.json(status);
});

authed.post("/health/test-notification", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { message?: string };
  const result = await testAdminNotificationBroadcast(String(body.message || "").trim());
  return c.json({ ok: true, ...result });
});

authed.post("/health/test-scanner", async (c) => {
  const portone = Boolean(process.env.PORTONE_API_KEY || process.env.IAMPORT_IMP_CODE);
  return c.json({
    ok: portone,
    scanner: {
      portoneConfigured: portone,
      impCode: process.env.IAMPORT_IMP_CODE ? "set" : "missing",
      apiKey: process.env.PORTONE_API_KEY ? "set" : "missing"
    }
  });
});

/** GET /api/admin/console/security-search-alerts — 쇼케이스 검색 어뷰징 경보 */
authed.get("/security-search-alerts", async (c) => {
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(c.req.query("limit") ?? "40"), 10) || 40));
  const onlyOpen = String(c.req.query("open") ?? "1") !== "0";
  const rows = await prisma.securitySearchAlert.findMany({
    where: onlyOpen ? { acknowledged: false } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          publicHandle: true,
          legalName: true,
          accountStatus: true,
          searchAbuseStrikeCount: true
        }
      }
    }
  });
  return c.json({ ok: true, items: rows });
});

/** POST /api/admin/console/security-search-alerts/:id/ack */
authed.post("/security-search-alerts/:id/ack", async (c) => {
  const id = c.req.param("id");
  await prisma.securitySearchAlert.update({
    where: { id },
    data: { acknowledged: true }
  });
  return c.json({ ok: true });
});

/** VLUE Signature Sound 관리 게시판 */
authed.get("/signature-sounds", async (c) => {
  const { listAdminSignatureSounds } = await import("../services/showcase/showcaseSoundService.js");
  const items = await listAdminSignatureSounds();
  return c.json({ ok: true, items });
});

authed.post("/signature-sounds/upload-url", async (c) => {
  const admin = c.get("adminConsoleUser");
  const body = await c.req.json().catch(() => ({}));
  try {
    const { createShowcaseSoundUploadUrl } = await import(
      "../services/showcase/showcaseSoundStorage.js"
    );
    const result = await createShowcaseSoundUploadUrl({
      userId: admin.id,
      fileName: String(body.fileName || "signature.mp3"),
      contentType: String(body.contentType || "audio/mpeg"),
      fileSize: body.fileSize,
      prefix: "signature"
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "upload_url_failed" }, 400);
  }
});

authed.post("/signature-sounds", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  try {
    const { createSignatureSound } = await import("../services/showcase/showcaseSoundService.js");
    const sound = await createSignatureSound({
      title: String(body.title || ""),
      artistName: body.artistName,
      audioUrl: String(body.audioUrl || ""),
      objectKey: body.objectKey,
      contentType: body.contentType,
      fileSize: body.fileSize,
      sortOrder: body.sortOrder,
      adminNote: body.adminNote,
      isPublished: body.isPublished !== false
    });
    return c.json({ ok: true, sound });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "create_failed" }, 400);
  }
});

authed.patch("/signature-sounds/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  try {
    const { updateSignatureSound } = await import("../services/showcase/showcaseSoundService.js");
    const sound = await updateSignatureSound(id, {
      title: body.title,
      artistName: body.artistName,
      sortOrder: body.sortOrder,
      adminNote: body.adminNote,
      isPublished: body.isPublished,
      deleted: body.deleted === true
    });
    return c.json({ ok: true, sound });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "update_failed" }, 400);
  }
});

authed.route("/pricing-config", adminPricingConfigRoutes);
authed.route("/enterprise-dcc", enterpriseDccAdminRoutes);
adminConsoleRoutes.route("/", authed);
