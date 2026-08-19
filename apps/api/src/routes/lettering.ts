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
  saveDccExposure,
  updateSearchPrivacy,
  type ShowcaseSearchMode
} from "../services/showcase/SearchService.js";
import { parseSearchOrigin } from "../services/dcc/dccAddressDistance.js";
import {
  createShowcaseComment,
  deleteShowcaseComment,
  getShowcaseSocialSummary,
  listShowcaseComments,
  recordShowcaseShare,
  toggleShowcaseLike,
  updateShowcaseComment
} from "../services/showcase/ShowcaseSocialService.js";
import {
  getUserShowcasePublicLive,
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
    isIdSearchAllowed: body?.isIdSearchAllowed,
    isAddressSearchAllowed: body?.isAddressSearchAllowed
  });
  return c.json({ ok: true, privacy });
});

/** DCC 검색·팔로우 노출 4항목 — 전부 지정해야 저장 */
letteringRoutes.get("/dcc-exposure", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const privacy = await getSearchPrivacy(me);
  return c.json({
    ok: true,
    exposure: {
      configured: Boolean(privacy?.dccExposureConfigured),
      phoneSearch: privacy?.dccExposureConfigured ? Boolean(privacy.isPhoneSearchAllowed) : null,
      addressSearch: privacy?.dccExposureConfigured ? Boolean(privacy.isAddressSearchAllowed) : null,
      phoneFollow: privacy?.dccExposureConfigured ? Boolean(privacy.isPhoneFollowersAllowed) : null,
      addressFollow: privacy?.dccExposureConfigured ? Boolean(privacy.isAddressFollowersAllowed) : null
    },
    privacy
  });
});

letteringRoutes.put("/dcc-exposure", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  try {
    const privacy = await saveDccExposure(me, {
      phoneSearch: body?.phoneSearch,
      addressSearch: body?.addressSearch,
      phoneFollow: body?.phoneFollow,
      addressFollow: body?.addressFollow
    });
    return c.json({ ok: true, privacy });
  } catch (e) {
    if (e instanceof Error && e.name === "EXPOSURE_REQUIRED") {
      return c.json({ ok: false, error: "EXPOSURE_REQUIRED", message: "검색·팔로우 노출 설정을 지정해야 저장됩니다." }, 400);
    }
    throw e;
  }
});

/** 쇼케이스 편집·라이브 스타일 기기 간 동기화 (slim v2 · 조건부 hydrate) */
letteringRoutes.get("/showcase/style", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const rawIfNone =
    c.req.header("If-None-Match") ||
    c.req.query("ifNoneMatch") ||
    c.req.query("sinceUpdatedAt") ||
    null;
  const ifNoneMatch = String(rawIfNone || "")
    .trim()
    .replace(/^W\//i, "")
    .replace(/^"|"$/g, "");
  const bundle = await getUserShowcaseStyleBundle(me, { ifNoneMatch });
  if (bundle.unchanged) {
    return c.json(
      { ok: true, v: 2, unchanged: true, updatedAt: bundle.updatedAt },
      200,
      bundle.updatedAt ? { ETag: `"${bundle.updatedAt}"` } : undefined
    );
  }
  return c.json(
    { ok: true, ...bundle },
    200,
    bundle.updatedAt ? { ETag: `"${bundle.updatedAt}"` } : undefined
  );
});

letteringRoutes.put("/showcase/style", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  try {
    const result = await putUserShowcaseStyleBundle(me, {
      editor: body?.editor,
      live: body?.live,
      liveSource: body?.liveSource,
      clientUpdatedAt: body?.clientUpdatedAt ?? body?.updatedAt ?? null
    });
    if (!result.ok) {
      return c.json({ ok: false, conflict: true, ...result.bundle }, 409);
    }
    return c.json({ ok: true, v: 2, updatedAt: result.updatedAt });
  } catch (e) {
    const err = e as Error & { code?: string; status?: number };
    if (err.code === "STYLE_TOO_LARGE" || err.status === 400) {
      return c.json({ ok: false, error: err.message, code: err.code }, 400);
    }
    throw e;
  }
});

/** 상대 공개 라이브 쇼케이스 스타일 (편집본 editor는 미노출 · public slim) */
letteringRoutes.get("/showcase/style/:userId", async (c) => {
  const userId = String(c.req.param("userId") || "").trim();
  if (!userId) return c.json({ ok: false, error: "user required" }, 400);
  const numberQ = String(c.req.query("number") || c.req.query("phone") || "").trim();
  if (numberQ) {
    const { getLineShowcasePublicByPhone } = await import("../services/dcc/dccLineService.js");
    const lineLive = await getLineShowcasePublicByPhone(numberQ);
    if (lineLive) {
      return c.json(
        {
          ok: true,
          v: 2,
          live: lineLive.live,
          liveSource: lineLive.liveSource,
          updatedAt: lineLive.updatedAt,
          lineId: lineLive.cardId
        },
        200,
        { "Cache-Control": "private, max-age=60" }
      );
    }
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, hasActiveShowcase: true }
  });
  if (!user || user.status !== "ACTIVE") {
    return c.json({ ok: false, error: "not_found" }, 404);
  }
  const rawIfNone =
    c.req.header("If-None-Match") ||
    c.req.query("ifNoneMatch") ||
    c.req.query("sinceUpdatedAt") ||
    null;
  const ifNoneMatch = String(rawIfNone || "")
    .trim()
    .replace(/^W\//i, "")
    .replace(/^"|"$/g, "");
  const pub = await getUserShowcasePublicLive(userId, { ifNoneMatch });
  if (pub.unchanged) {
    return c.json(
      { ok: true, v: 2, unchanged: true, updatedAt: pub.updatedAt },
      200,
      pub.updatedAt
        ? { ETag: `"${pub.updatedAt}"`, "Cache-Control": "private, max-age=60" }
        : { "Cache-Control": "private, max-age=60" }
    );
  }
  return c.json(
    {
      ok: true,
      v: 2,
      live: pub.live,
      liveSource: pub.liveSource,
      updatedAt: pub.updatedAt
    },
    200,
    pub.updatedAt
      ? { ETag: `"${pub.updatedAt}"`, "Cache-Control": "private, max-age=60" }
      : { "Cache-Control": "private, max-age=60" }
  );
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

  if (!q) return c.json({ ok: true, mode, tag: null, items: [], originReady: false });

  try {
    const origin = parseSearchOrigin(c.req.query("lat") ?? c.req.query("latitude"), c.req.query("lng") ?? c.req.query("longitude"));
    const { items, originReady } = await runShowcaseSearch({
      mode,
      query: q,
      limit: 24,
      viewerId: c.get("vlueUserId") || null,
      origin
    });
    return c.json({
      ok: true,
      mode,
      tag: mode === "hashtag" ? normalizeShowcaseTag(q) : null,
      originReady,
      items
    });
  } catch (e) {
    console.error("[showcase/tags/search]", e);
    return c.json(
      {
        ok: false,
        error: "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        code: "SEARCH_INTERNAL"
      },
      500
    );
  }
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
    slideId: body?.slideId,
    liked: typeof body?.liked === "boolean" ? body.liked : undefined
  });
  return c.json({ ok: true, ...result });
});

/** V2 — 댓글 목록 */
letteringRoutes.get("/showcase/social/:ownerUserId/comments", async (c) => {
  const ownerUserId = String(c.req.param("ownerUserId") || "").trim();
  if (!ownerUserId) return c.json({ ok: false, error: "owner required" }, 400);
  const comments = await listShowcaseComments({
    ownerUserId,
    actorUserId: String(c.req.header("x-vlue-user-id") || "").trim() || null,
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

/** V2 — 본인 댓글 수정 */
letteringRoutes.patch("/showcase/social/:ownerUserId/comments/:commentId", requireUserHeader, async (c) => {
  const ownerUserId = String(c.req.param("ownerUserId") || "").trim();
  const commentId = String(c.req.param("commentId") || "").trim();
  const me = String(c.get("vlueUserId") || c.req.header("x-vlue-user-id") || "").trim();
  if (!ownerUserId || !me) return c.json({ ok: false, error: "auth required" }, 401);
  const body = await c.req.json().catch(() => ({}));
  const result = await updateShowcaseComment({
    ownerUserId,
    authorUserId: me,
    commentId,
    body: body?.body
  });
  if (!result.ok) return c.json({ ok: false, error: result.error }, result.status);
  return c.json({ ok: true, comment: result.comment });
});

/** V2 — 본인 댓글 삭제 */
letteringRoutes.delete("/showcase/social/:ownerUserId/comments/:commentId", requireUserHeader, async (c) => {
  const ownerUserId = String(c.req.param("ownerUserId") || "").trim();
  const commentId = String(c.req.param("commentId") || "").trim();
  const me = String(c.get("vlueUserId") || c.req.header("x-vlue-user-id") || "").trim();
  if (!ownerUserId || !me) return c.json({ ok: false, error: "auth required" }, 401);
  const result = await deleteShowcaseComment({
    ownerUserId,
    authorUserId: me,
    commentId
  });
  if (!result.ok) return c.json({ ok: false, error: result.error }, result.status);
  return c.json({ ok: true });
});

/** V2 — 쇼케이스 공유 알림 */
letteringRoutes.post("/showcase/social/:ownerUserId/share", requireUserHeader, async (c) => {
  const ownerUserId = String(c.req.param("ownerUserId") || "").trim();
  const me = String(c.get("vlueUserId") || c.req.header("x-vlue-user-id") || "").trim();
  if (!ownerUserId || !me) return c.json({ ok: false, error: "auth required" }, 401);
  const body = await c.req.json().catch(() => ({}));
  const result = await recordShowcaseShare({
    ownerUserId,
    actorUserId: me,
    slideId: body?.slideId
  });
  return c.json({ ok: true, notified: Boolean(result.notified) });
});
