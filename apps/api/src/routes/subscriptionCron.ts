import { Hono } from "hono";
import { runSubscriptionBillingBatch } from "../cron/subscriptionScheduler.js";
import { runPersonalComboReverificationBatch } from "../services/membership/personalComboReverifyScheduler.js";

export const subscriptionCronRoutes = new Hono();

function parseAsOfQuery(raw: string | undefined): Date | undefined {
  if (!raw?.trim()) return undefined;
  const key = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return undefined;
  return new Date(`${key}T12:00:00+09:00`);
}

/**
 * POST /api/cron/subscription-billing
 * Header: X-Subscription-Cron-Secret (SUBSCRIPTION_CRON_SECRET)
 * Query: ?asOf=2026-05-21&dryRun=1&overdue=1
 */
subscriptionCronRoutes.post("/subscription-billing", async (c) => {
  const secret = c.req.header("X-Subscription-Cron-Secret") || "";
  const expected = process.env.SUBSCRIPTION_CRON_SECRET || "";
  if (expected && secret !== expected) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const asOf = parseAsOfQuery(c.req.query("asOf"));
  const dryRun = c.req.query("dryRun") === "1" || c.req.query("dryRun") === "true";
  const includeOverdue = c.req.query("overdue") === "1" || c.req.query("overdue") === "true";

  try {
    const summary = await runSubscriptionBillingBatch({
      asOf,
      dryRun,
      includeOverdue
    });
    return c.json({ ok: true, ...summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "SUBSCRIPTION_CRON_FAILED" }, 500);
  }
});

/**
 * POST /api/cron/personal-combo-reverify
 * Header: X-Subscription-Cron-Secret (SUBSCRIPTION_CRON_SECRET)
 * Query: ?asOf=2026-05-21&dryRun=1
 */
subscriptionCronRoutes.post("/personal-combo-reverify", async (c) => {
  const secret = c.req.header("X-Subscription-Cron-Secret") || "";
  const expected = process.env.SUBSCRIPTION_CRON_SECRET || "";
  if (expected && secret !== expected) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const asOf = parseAsOfQuery(c.req.query("asOf"));
  const dryRun = c.req.query("dryRun") === "1" || c.req.query("dryRun") === "true";

  try {
    const summary = await runPersonalComboReverificationBatch({ asOf, dryRun });
    return c.json({ ok: true, ...summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "PERSONAL_COMBO_REVERIFY_FAILED" }, 500);
  }
});
