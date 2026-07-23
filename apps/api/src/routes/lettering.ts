import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import { SearchAuthInterceptor } from "../middleware/SearchAuthInterceptor.js";
import {
  normalizeShowcaseTag,
  sanitizeShowcaseTags,
  updateUserShowcaseTags,
  userHasPaidMembership
} from "../services/showcase/showcaseTagsService.js";
import {
  getSearchPrivacy,
  runShowcaseSearch,
  updateSearchPrivacy,
  type ShowcaseSearchMode
} from "../services/showcase/SearchService.js";
import {
  createShowcaseComment,
  getShowcaseSocialSummary,
  listShowcaseComments,
  toggleShowcaseLike
} from "../services/showcase/ShowcaseSocialService.js";
import {
  getUserShowcaseStyleBundle,
  putUserShowcaseStyleBundle
} from "../services/showcase/showcaseStyleSyncService.js";

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

/** V1 — 검색 프라이버시 토글 조회 */
letteringRoutes.get("/showcase/search-privacy", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const privacy = await getSearchPrivacy(me);
  return c.json({ ok: true, privacy });
});

/** V1 — 검색 프라이버시 토글 저장 */
letteringRoutes.put("/showcase/search-privacy", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  const privacy = await updateSearchPrivacy(me, {
    isPhoneSearchAllowed: body?.isPhoneSearchAllowed,
    isNameSearchAllowed: body?.isNameSearchAllowed,
    isOrgSearchAllowed: body?.isOrgSearchAllowed,
    isIdSearchAllowed: body?.isIdSearchAllowed
  });
  return c.json({ ok: true, privacy });
});

/** 쇼케이스 편집·라이브 스타일 기기 간 동기화 */
letteringRoutes.get("/showcase/style", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const bundle = await getUserShowcaseStyleBundle(me);
  return c.json({ ok: true, ...bundle });
});

letteringRoutes.put("/showcase/style", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  const result = await putUserShowcaseStyleBundle(me, {
    editor: body?.editor,
    live: body?.live,
    liveSource: body?.liveSource,
    clientUpdatedAt: body?.clientUpdatedAt ?? body?.updatedAt ?? null
  });
  if (!result.ok) {
    return c.json({ ok: false, conflict: true, ...result.bundle }, 409);
  }
  return c.json({ ok: true, ...result.bundle });
});

/**
 * V1 — 쇼케이스 검색 (상호주의·레이트리밋·마스킹)
 * query: q | tag, mode=hashtag|phone|name|id
 */
letteringRoutes.get("/showcase/tags/search", SearchAuthInterceptor, async (c) => {
  const q = String(c.req.query("q") ?? c.req.query("tag") ?? "").trim();
  const modeRaw = String(c.req.query("mode") ?? "hashtag").trim().toLowerCase();
  const mode: ShowcaseSearchMode =
    modeRaw === "phone" || modeRaw === "name" || modeRaw === "id" ? modeRaw : "hashtag";

  if (!q) return c.json({ ok: true, mode, tag: null, items: [] });

  const { items } = await runShowcaseSearch({ mode, query: q, limit: 24 });
  return c.json({
    ok: true,
    mode,
    tag: mode === "hashtag" ? normalizeShowcaseTag(q) : null,
    items
  });
});

/** V2 — 쇼케이스 소셜 요약 (좋아요·최근 댓글) */
letteringRoutes.get("/showcase/social/:ownerUserId", async (c) => {
  const ownerUserId = String(c.req.param("ownerUserId") || "").trim();
  if (!ownerUserId) return c.json({ ok: false, error: "owner required" }, 400);
  const slideId = c.req.query("slideId");
  const me = String(c.req.header("x-vlue-user-id") || "").trim() || null;
  const summary = await getShowcaseSocialSummary({ ownerUserId, actorUserId: me, slideId });
  return c.json({ ok: true, ...summary });
});

/** V2 — 좋아요 토글 */
letteringRoutes.post("/showcase/social/:ownerUserId/like", requireUserHeader, async (c) => {
  const ownerUserId = String(c.req.param("ownerUserId") || "").trim();
  const me = String(c.get("vlueUserId") || c.req.header("x-vlue-user-id") || "").trim();
  if (!ownerUserId || !me) return c.json({ ok: false, error: "auth required" }, 401);
  const body = await c.req.json().catch(() => ({}));
  const result = await toggleShowcaseLike({
    ownerUserId,
    actorUserId: me,
    slideId: body?.slideId
  });
  return c.json({ ok: true, ...result });
});

/** V2 — 댓글 목록 */
letteringRoutes.get("/showcase/social/:ownerUserId/comments", async (c) => {
  const ownerUserId = String(c.req.param("ownerUserId") || "").trim();
  if (!ownerUserId) return c.json({ ok: false, error: "owner required" }, 400);
  const comments = await listShowcaseComments({
    ownerUserId,
    slideId: c.req.query("slideId"),
    limit: Number(c.req.query("limit") || 50)
  });
  return c.json({ ok: true, comments });
});

/** V2 — 댓글 작성 */
letteringRoutes.post("/showcase/social/:ownerUserId/comments", requireUserHeader, async (c) => {
  const ownerUserId = String(c.req.param("ownerUserId") || "").trim();
  const me = String(c.get("vlueUserId") || c.req.header("x-vlue-user-id") || "").trim();
  if (!ownerUserId || !me) return c.json({ ok: false, error: "auth required" }, 401);
  const body = await c.req.json().catch(() => ({}));
  const result = await createShowcaseComment({
    ownerUserId,
    authorUserId: me,
    body: body?.body,
    slideId: body?.slideId,
    parentId: body?.parentId
  });
  if (!result.ok) return c.json({ ok: false, error: result.error }, result.status);
  return c.json({ ok: true, comment: result.comment });
});
