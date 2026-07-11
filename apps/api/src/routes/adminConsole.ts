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

authed.route("/pricing-config", adminPricingConfigRoutes);
adminConsoleRoutes.route("/", authed);
