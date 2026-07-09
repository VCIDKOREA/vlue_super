import { Hono } from "hono";
import { z } from "zod";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  processCallEndAlimtalk,
  registerAlimtalkOptOut
} from "../services/alimtalk/alimtalkCallEndService.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";

export const notificationRoutes = new Hono();

const callEndedBody = z.object({
  peerPhone: z.string().min(6),
  durationSec: z.number().int().nonnegative().optional(),
  direction: z.enum(["in", "out"]).optional()
});

/** VLUE 가입자 통화 종료 → 미가입 상대에게 알림톡 (필터링 포함) */
notificationRoutes.post("/alimtalk/call-ended", requireUserHeader, async (c) => {
  const callerUserId = c.get("vlueUserId") as string;
  const parsed = callEndedBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ ok: false, error: "peerPhone이 필요합니다.", details: parsed.error.flatten() }, 400);
  }

  const result = await processCallEndAlimtalk(callerUserId, parsed.data);
  return c.json(result, result.ok ? 200 : 400);
});

/** 알림톡 수신거부 — 상대 번호 블랙리스트 등록 */
notificationRoutes.post("/alimtalk/opt-out", async (c) => {
  const raw = String((await c.req.json().catch(() => ({})) as { phone?: string })?.phone || "").trim();
  const e164 = normalizeToE164KR(raw);
  if (!e164) return c.json({ ok: false, error: "유효한 번호가 아닙니다." }, 400);
  await registerAlimtalkOptOut(e164);
  console.info("[alimtalk:opt-out] registered", e164);
  return c.json({ ok: true, phoneE164: e164 });
});

/** 개발용 — 필터 시나리오 확인 */
notificationRoutes.post("/alimtalk/call-ended/dry-run", requireUserHeader, async (c) => {
  const callerUserId = c.get("vlueUserId") as string;
  const parsed = callEndedBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ ok: false, error: "peerPhone이 필요합니다." }, 400);
  }
  const result = await processCallEndAlimtalk(callerUserId, parsed.data);
  return c.json({ ...result, dryRun: true });
});
