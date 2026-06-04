import { Hono } from "hono";
import { setCallOverlayCache } from "../services/overlay/callCache.js";

export const telecomWebhookRoutes = new Hono();

/**
 * LG U+ 센트릭스 / KT 비즈 — 단일 인바운드 웹훅
 * { display_number, real_cli_number, destination_number, event: 'CALL_START' }
 */
telecomWebhookRoutes.post("/inbound", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    display_number?: string;
    real_cli_number?: string;
    destination_number?: string;
    event?: string;
  };

  if (body.event && body.event !== "CALL_START") {
    return c.json({ ok: true, ignored: true });
  }

  const destination = String(body.destination_number || "").trim();
  const realCli = String(body.real_cli_number || "").trim();
  const display = String(body.display_number || "").trim();

  if (!destination || !realCli) {
    return c.json({ ok: false, error: "destination_number and real_cli_number required" }, 400);
  }

  await setCallOverlayCache({
    destinationNumber: destination,
    realCliNumber: realCli,
    displayNumber: display || destination
  });

  return c.json({ ok: true, cached: true, ttlSec: 30 });
});
