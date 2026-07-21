import { Hono } from "hono";
import type { Context } from "hono";
import { resolveRequestUserId } from "../lib/authContext.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import { MycaseBroadcastError } from "../services/mycase/mycasePolicy.js";
import {
  archiveShowcaseSnapshot,
  createMycase,
  getBroadcastPolicy,
  getMycaseDetail,
  listMycaseForViewer,
  listMycaseMine,
  setMainBroadcast,
  softDeleteMycase,
  updateMycase
} from "../services/mycase/mycaseService.js";

export const mycaseRoutes = new Hono();

function handleMycaseError(c: Context, e: unknown) {
  if (e instanceof MycaseBroadcastError) {
    return c.json(
      {
        ok: false,
        error: e.code,
        message: e.message,
        details: e.details || null
      },
      e.status as 400 | 403 | 404
    );
  }
  console.error("[mycase]", e);
  return c.json({ ok: false, error: "internal", message: "서버 오류" }, 500);
}

/** 내 송출 정책(티어·슬롯·쿨다운) */
mycaseRoutes.get("/policy", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const policy = await getBroadcastPolicy(me);
  return c.json({ ok: true, policy });
});

/** 내 마이케이스 그리드 (페이지네이션) */
mycaseRoutes.get("/me", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const limit = Number(c.req.query("limit") || 24);
  const cursor = c.req.query("cursor") || undefined;
  const data = await listMycaseMine(me, limit, cursor);
  return c.json({ ok: true, ...data });
});

/** 타인 케이스함 — 공개 + 메인 송출 + 프라이버시 */
mycaseRoutes.get("/user/:userId", async (c) => {
  const viewerId = await resolveRequestUserId(c);
  const userId = String(c.req.param("userId") || "").trim();
  if (!userId) return c.json({ ok: false, error: "userId required" }, 400);

  const limit = Number(c.req.query("limit") || 24);
  const cursor = c.req.query("cursor") || undefined;
  const data = await listMycaseForViewer(viewerId, userId, limit, cursor);
  if (!data.ok) return c.json({ ok: false, error: data.error }, data.status);
  return c.json(data);
});

/** 단건 상세 (페이로드 포함) */
mycaseRoutes.get("/:caseId", async (c) => {
  const viewerId = await resolveRequestUserId(c);
  const caseId = String(c.req.param("caseId") || "").trim();
  try {
    const data = await getMycaseDetail(viewerId, caseId);
    return c.json({ ok: true, ...data });
  } catch (e) {
    return handleMycaseError(c, e);
  }
});

/** 새 아카이브 게시물 생성 (누적) */
mycaseRoutes.post("/", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  let body: {
    title?: string;
    thumbnailUrl?: string | null;
    payloadJson?: unknown;
    isPublic?: boolean;
    isMainBroadcast?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid JSON" }, 400);
  }

  try {
    const item = await createMycase(me, {
      title: String(body.title || "쇼케이스"),
      thumbnailUrl: body.thumbnailUrl,
      payloadJson: body.payloadJson ?? {},
      isPublic: body.isPublic,
      isMainBroadcast: body.isMainBroadcast
    });
    const policy = await getBroadcastPolicy(me);
    return c.json({ ok: true, item, policy }, 201);
  } catch (e) {
    return handleMycaseError(c, e);
  }
});

/**
 * 쇼케이스 저장 시 호출 — 기존 케이스를 덮지 않고 새 행으로 아카이브.
 * body: { title, thumbnailUrl, payloadJson, isPublic?, supersedesCaseId? }
 */
mycaseRoutes.post("/archive", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  let body: {
    title?: string;
    thumbnailUrl?: string | null;
    payloadJson?: unknown;
    isPublic?: boolean;
    supersedesCaseId?: string | null;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid JSON" }, 400);
  }

  try {
    const item = await archiveShowcaseSnapshot(me, {
      title: String(body.title || "쇼케이스"),
      thumbnailUrl: body.thumbnailUrl,
      payloadJson: body.payloadJson ?? {},
      isPublic: body.isPublic,
      supersedesCaseId: body.supersedesCaseId
    });
    return c.json({ ok: true, item }, 201);
  } catch (e) {
    return handleMycaseError(c, e);
  }
});

/** 메타데이터 수정 (내용 전면 교체는 /archive 권장) */
mycaseRoutes.patch("/:caseId", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const caseId = String(c.req.param("caseId") || "").trim();
  let body: {
    title?: string;
    thumbnailUrl?: string | null;
    payloadJson?: unknown;
    isPublic?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid JSON" }, 400);
  }

  try {
    const item = await updateMycase(me, caseId, body);
    return c.json({ ok: true, item });
  } catch (e) {
    return handleMycaseError(c, e);
  }
});

/** 메인 송출 ON/OFF — 티어·슬롯·쿨다운 검증 */
mycaseRoutes.put("/:caseId/broadcast", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const caseId = String(c.req.param("caseId") || "").trim();
  let body: { enabled?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid JSON" }, 400);
  }

  if (typeof body.enabled !== "boolean") {
    return c.json({ ok: false, error: "enabled boolean required" }, 400);
  }

  try {
    const result = await setMainBroadcast(me, caseId, body.enabled);
    return c.json({ ok: true, ...result });
  } catch (e) {
    return handleMycaseError(c, e);
  }
});

/** soft delete */
mycaseRoutes.delete("/:caseId", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const caseId = String(c.req.param("caseId") || "").trim();
  try {
    const result = await softDeleteMycase(me, caseId);
    const policy = await getBroadcastPolicy(me);
    return c.json({ ok: true, id: result.id, policy });
  } catch (e) {
    return handleMycaseError(c, e);
  }
});
