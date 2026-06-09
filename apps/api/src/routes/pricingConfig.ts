import { Hono } from "hono";
import { requireAdminConsoleBearer } from "../middleware/adminConsoleGate.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import type { PricingConfigFile } from "../services/pricing/pricingConfigSchema.js";
import type { AdminConsoleUserVar } from "../middleware/adminConsoleGate.js";
import { loadPricingConfig, savePricingConfig } from "../services/pricing/pricingConfigService.js";
import { getPricingRevenueStats } from "../services/pricing/pricingRevenueStats.js";
import { resolveMembershipAccess } from "../services/membership/membershipAccessService.js";

export const pricingConfigRoutes = new Hono();

/** GET /api/pricing/config — 앱·웹 공개 조회 */
pricingConfigRoutes.get("/config", async (c) => {
  const config = await loadPricingConfig();
  return c.json({ ok: true, config });
});

/** GET /api/pricing/access — 로그인 사용자 멤버십 권한 스냅샷 */
pricingConfigRoutes.get("/access", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const access = await resolveMembershipAccess(userId);
  return c.json({ ok: true, access });
});

/** GET /api/pricing/revenue-stats — 관리자 매출 (planSku 필터) */
pricingConfigRoutes.get("/revenue-stats", requireAdminConsoleBearer, async (c) => {
  const planSku = c.req.query("planSku") || "";
  const from = c.req.query("from") || "";
  const to = c.req.query("to") || "";
  const stats = await getPricingRevenueStats({ planSku, from, to });
  return c.json({ ok: true, stats });
});

/** Admin mount: /api/admin/console/pricing-config */
export const adminPricingConfigRoutes = new Hono<{ Variables: { adminConsoleUser: AdminConsoleUserVar } }>();

adminPricingConfigRoutes.get("/", async (c) => {
  const config = await loadPricingConfig(true);
  return c.json({ ok: true, config });
});

adminPricingConfigRoutes.put("/", async (c) => {
  const admin = c.get("adminConsoleUser") as { userId?: string; publicHandle?: string };
  const body = (await c.req.json().catch(() => null)) as { config?: PricingConfigFile } | null;
  if (!body?.config) return c.json({ error: "config 본문이 필요합니다." }, 400);
  try {
    const saved = await savePricingConfig(body.config, admin?.publicHandle || admin?.userId || "admin");
    return c.json({ ok: true, config: saved });
  } catch (err) {
    return c.json({ error: (err as Error).message || "저장 실패" }, 400);
  }
});
