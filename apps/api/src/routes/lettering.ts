import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  normalizeShowcaseTag,
  sanitizeShowcaseTags,
  searchUsersByShowcaseTag,
  updateUserShowcaseTags,
  userHasPaidMembership
} from "../services/showcase/showcaseTagsService.js";

export const letteringRoutes = new Hono();

const REPORT_REASON_LABELS: Record<string, string> = {
  spam: "스팸·광고",
  fraud: "사기·피싱",
  abuse: "욕설·협박",
  other: "기타"
};

function reasonLabel(reasonId: string) {
  return REPORT_REASON_LABELS[reasonId] || REPORT_REASON_LABELS.other;
}

/** 번호별 신고·제보 이력 (웹 상세·오버레이 미리보기 — 공개 조회) */
letteringRoutes.get("/reports/by-phone", async (c) => {
  const raw = String(c.req.query("number") ?? c.req.query("phone") ?? "").trim();
  const e164 = normalizeToE164KR(raw);
  if (!e164) {
    return c.json({ ok: true, phoneE164: "", total: 0, items: [], limit: 0, offset: 0 }, 200);
  }

  const limit = Math.min(100, Math.max(1, Number.parseInt(String(c.req.query("limit") ?? "20"), 10) || 20));
  const offset = Math.max(0, Number.parseInt(String(c.req.query("offset") ?? "0"), 10) || 0);

  const where = { phoneE164: e164 };

  const [total, rows] = await Promise.all([
    prisma.letteringPhoneReport.count({ where }),
    prisma.letteringPhoneReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        reasonId: true,
        detail: true,
        createdAt: true
      }
    })
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    reasonId: row.reasonId,
    reasonLabel: reasonLabel(row.reasonId),
    detail: row.detail || "",
    createdAt: row.createdAt.toISOString(),
    source: "report"
  }));

  return c.json({ ok: true, phoneE164: e164, total, items, limit, offset }, 200);
});

/** 차단 여부 (오버레이 표시 전 네이티브·웹 공용) */
letteringRoutes.get("/blocks/check", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const raw = String(c.req.query("number") ?? "").trim();
  const e164 = normalizeToE164KR(raw);
  if (!e164) return c.json({ blocked: false, matched: false }, 200);

  const row = await prisma.letteringPhoneBlock.findUnique({
    where: { ownerId_phoneE164: { ownerId: me, phoneE164: e164 } }
  });
  return c.json({ blocked: Boolean(row), phoneE164: e164 }, 200);
});

/** 번호 차단 등록 (신고·차단 / 차단만) */
letteringRoutes.post("/blocks", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  const raw = String(body.phone ?? body.number ?? "").trim();
  const e164 = normalizeToE164KR(raw);
  if (!e164) return c.json({ error: "유효한 번호가 아닙니다." }, 400);

  const reason = String(body.reason ?? "").trim() || null;
  const reportId = String(body.reportId ?? "").trim() || null;

  const row = await prisma.letteringPhoneBlock.upsert({
    where: { ownerId_phoneE164: { ownerId: me, phoneE164: e164 } },
    create: { ownerId: me, phoneE164: e164, reason, reportId },
    update: { reason: reason ?? undefined, reportId: reportId ?? undefined }
  });

  return c.json({ ok: true, blocked: true, id: row.id, phoneE164: e164 }, 201);
});

/** 신고 접수 + 자동 차단 */
letteringRoutes.post("/reports", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  const raw = String(body.phone ?? body.number ?? "").trim();
  const e164 = normalizeToE164KR(raw);
  if (!e164) return c.json({ error: "유효한 번호가 아닙니다." }, 400);

  const reasonId = String(body.reasonId ?? "other").trim();
  const detail = String(body.detail ?? "").trim() || null;
  const cardSnapshot = body.cardSnapshot ?? body.card ?? null;

  const report = await prisma.letteringPhoneReport.create({
    data: {
      reporterId: me,
      phoneE164: e164,
      reasonId,
      detail,
      cardSnapshot: cardSnapshot && typeof cardSnapshot === "object" ? cardSnapshot : undefined
    }
  });

  await prisma.letteringPhoneBlock.upsert({
    where: { ownerId_phoneE164: { ownerId: me, phoneE164: e164 } },
    create: {
      ownerId: me,
      phoneE164: e164,
      reason: `report:${reasonId}`,
      reportId: report.id
    },
    update: {
      reason: `report:${reasonId}`,
      reportId: report.id
    }
  });

  return c.json({ ok: true, reportId: report.id, phoneE164: e164, autoBlocked: true }, 201);
});

/** V1 — 유료 회원 쇼케이스 #해시태그 등록 */
letteringRoutes.put("/showcase/tags", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  const paid = await userHasPaidMembership(me);
  if (!paid) {
    return c.json({ error: "해시태그는 유료 회원만 등록할 수 있습니다." }, 403);
  }
  const tags = sanitizeShowcaseTags(body?.tags);
  const saved = await updateUserShowcaseTags(me, tags);
  return c.json({ ok: true, tags: saved });
});

/** V1 — #해시태그로 쇼케이스 검색 (홈 디렉토리) */
letteringRoutes.get("/showcase/tags/search", async (c) => {
  const q = String(c.req.query("q") ?? c.req.query("tag") ?? "").trim();
  if (!q) return c.json({ ok: true, items: [] });
  const items = await searchUsersByShowcaseTag(q, 24);
  return c.json({ ok: true, tag: normalizeShowcaseTag(q), items });
});
