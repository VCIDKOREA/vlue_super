import { Hono } from "hono";
import type { RewardedAdAction } from "@prisma/client";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  consumeRewardedAdGrant,
  createRewardedAdChallenge,
  getMonetizationPolicy,
  getRewardedAdGrant,
  verifyAndApplyAdMobSsv
} from "../services/membership/rewardedAdPolicyService.js";

export const monetizationPolicyRoutes = new Hono();

monetizationPolicyRoutes.get("/policy", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId")!;
  return c.json({ ok: true, ...(await getMonetizationPolicy(userId)) });
});

monetizationPolicyRoutes.post("/reward/challenge", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  try {
    const result = await createRewardedAdChallenge({
      userId,
      action: String(body?.action || ""),
      targetKey: body?.targetKey
    });
    return c.json({ ok: true, ...result });
  } catch (error) {
    const err = error as Error & { status?: number };
    return c.json({ ok: false, error: err.message }, err.status === 400 ? 400 : 500);
  }
});

monetizationPolicyRoutes.get("/reward/:grantId", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId")!;
  const grant = await getRewardedAdGrant(userId, String(c.req.param("grantId") || ""));
  if (!grant) return c.json({ ok: false, error: "grant_not_found" }, 404);
  return c.json({ ok: true, grant });
});

monetizationPolicyRoutes.post("/reward/:grantId/consume", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  try {
    const result = await consumeRewardedAdGrant({
      userId,
      grantId: String(c.req.param("grantId") || ""),
      action: String(body?.action || "") as RewardedAdAction
    });
    return c.json(result, result.ok ? 200 : 403);
  } catch (error) {
    const err = error as Error & { status?: number };
    return c.json({ ok: false, error: err.message }, err.status === 400 ? 400 : 500);
  }
});

/** AdMob 콘솔 SSV 콜백 URL: /api/monetization/reward/ssv */
monetizationPolicyRoutes.get("/reward/ssv", async (c) => {
  try {
    const rawQuery = new URL(c.req.url).search.slice(1);
    await verifyAndApplyAdMobSsv(rawQuery);
    return c.text("OK", 200);
  } catch (error) {
    console.warn("[admob-ssv] rejected", error);
    return c.text("INVALID", 400);
  }
});
