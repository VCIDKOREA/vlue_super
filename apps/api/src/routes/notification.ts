import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  processCallEndAlimtalk,
  registerAlimtalkOptOut
} from "../services/alimtalk/alimtalkCallEndService.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";

export const notificationRoutes = new Hono();

function inboxCategory(title: string, body: string, pinKind?: string | null) {
  if (pinKind === "line_grace") return "결제";
  const t = `${title} ${body}`;
  if (/좋아요|댓글|답글|공유|쇼케이스/.test(t)) return "쇼케이스";
  if (/친구/.test(t)) return "친구";
  if (/팔로우/.test(t)) return "팔로우";
  if (/가족/.test(t)) return "가족보호";
  if (/결제|구매|구독|해지|유예|미납|만료/.test(t)) return "결제";
  return "앱";
}

/** 알림함 동기화 — OwnerNotification → 클라 수신함 */
notificationRoutes.get("/inbox", requireUserHeader, async (c) => {
  const me = String(c.get("vlueUserId") || c.req.header("x-vlue-user-id") || "").trim();
  if (!me) return c.json({ ok: false, error: "auth required" }, 401);
  const rows = await prisma.ownerNotification.findMany({
    where: { ownerUserId: me },
    orderBy: [{ pinKind: "desc" }, { createdAt: "desc" }],
    take: 80
  });
  const items = rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      read: row.status === "read" && !row.pinKind,
      category: inboxCategory(row.title, row.body, row.pinKind),
      pinned: Boolean(row.pinKind),
      pinKind: row.pinKind || null,
      pinKey: row.pinKey || null,
      payload: row.payloadJson || null
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return c.json({
    ok: true,
    items
  });
});

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
