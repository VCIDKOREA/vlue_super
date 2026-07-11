import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { verifyPassword } from "../lib/passwordHash.js";
import { issueTokenPair } from "../services/authSessions.js";
import { denyAdminAccessReasonForUser, isSuperAdminUser } from "../services/admin/superAdminAuth.js";
import { requireSuperAdminBearer } from "../middleware/superAdminGate.js";
import { getHomeLayout, saveHomeLayout } from "../services/office/hqHomeLayoutService.js";
import { listMasterCapabilities, PLATFORM_MASTER_ADMIN } from "../services/admin/platformAccountRoles.js";

type HqUser = {
  id: string;
  legalName: string | null;
  publicHandle: string | null;
};

type HqVars = { hqUser: HqUser };

export const adminHqRoutes = new Hono<{ Variables: HqVars }>();

adminHqRoutes.post("/login", async (c) => {
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
      accountStatus: true
    }
  });

  if (!user?.passwordHash) return c.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return c.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);

  const ceoDeny = denyAdminAccessReasonForUser(user);
  if (ceoDeny) return c.json({ error: ceoDeny, code: "CEO_NOT_SYSTEM_ADMIN" }, 403);

  if (!isSuperAdminUser(user)) {
    return c.json({ error: "SUPER_ADMIN 권한이 없습니다. 마스터 관리자(admin) 전용입니다." }, 403);
  }

  const pair = await issueTokenPair(user.id, { header: (n) => c.req.header(n) });
  return c.json({
    ok: true,
    role: "SUPER_ADMIN",
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

adminHqRoutes.use("/me", requireSuperAdminBearer);
adminHqRoutes.get("/me", async (c) => {
  const user = c.get("hqUser");
  return c.json({
    ok: true,
    role: "SUPER_ADMIN",
    accountKind: PLATFORM_MASTER_ADMIN.accountKind,
    capabilities: listMasterCapabilities(user),
    userId: user.id,
    legalName: user.legalName || "",
    publicHandle: user.publicHandle || ""
  });
});

adminHqRoutes.use("/home-layout", requireSuperAdminBearer);
adminHqRoutes.get("/home-layout", async (c) => {
  const layout = await getHomeLayout();
  return c.json({ ok: true, layout });
});

adminHqRoutes.put("/home-layout", async (c) => {
  const user = c.get("hqUser");
  const body = (await c.req.json().catch(() => ({}))) as { layout?: unknown };
  if (!body.layout || typeof body.layout !== "object") {
    return c.json({ error: "layout 객체가 필요합니다." }, 400);
  }
  const saved = await saveHomeLayout(body.layout, user.id);
  return c.json({ ok: true, layout: saved });
});
