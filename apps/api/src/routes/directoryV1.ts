import { Hono } from "hono";
import {
  lookupPublicDirectoryByPhone,
  searchPublicDirectory,
  listPublicDirectoryPhoneSync
} from "../services/search/publicDirectoryService.js";

export const directoryV1Routes = new Hono();

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
} as const;

/** GET /api/v1/directory/lookup?phone=02-416-4658 */
directoryV1Routes.get("/lookup", async (c) => {
  const phone = c.req.query("phone")?.trim() || c.req.query("q")?.trim() || "";
  if (!phone) {
    return c.json({ status: "error", message: "phone 쿼리가 필요합니다." }, 400);
  }
  try {
    const hit = await lookupPublicDirectoryByPhone(phone);
    if (!hit) {
      return c.json({ status: "success", matched: false, data: null }, 200, CACHE_HEADERS);
    }
    return c.json(
      {
        status: "success",
        matched: true,
        data: hit,
        vlue_auth_label: "VLUE 인증"
      },
      200,
      CACHE_HEADERS
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "디렉터리 조회 실패";
    return c.json({ status: "error", message }, 500);
  }
});

/**
 * GET /api/v1/directory/search?q=가락고등학교
 * min 2 chars, max 30 results — 통합검증 검색창용 (과도한 트래픽 방지)
 */
directoryV1Routes.get("/search", async (c) => {
  const q = c.req.query("q")?.trim() || c.req.query("keyword")?.trim() || "";
  if (q.length < 2) {
    return c.json({ status: "error", message: "검색어는 2자 이상이어야 합니다." }, 400);
  }
  const limit = Number(c.req.query("limit") || 12);
  try {
    const results = await searchPublicDirectory({ query: q, limit });
    return c.json(
      {
        status: "success",
        query: q,
        count: results.length,
        results,
        vlue_auth_label: "VLUE 인증"
      },
      200,
      CACHE_HEADERS
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "디렉터리 검색 실패";
    return c.json({ status: "error", message }, 500);
  }
});

/**
 * GET /api/v1/directory/sync?since=ISO&cursor=&limit=
 * 전화 있는 행만 페이지네이션 — 앱 로컬 캐시 동기화
 */
directoryV1Routes.get("/sync", async (c) => {
  const sinceRaw = c.req.query("since")?.trim() || "";
  const cursor = c.req.query("cursor")?.trim() || null;
  const limit = Number(c.req.query("limit") || 2000);
  let since: Date | null = null;
  if (sinceRaw) {
    const d = new Date(sinceRaw);
    if (!Number.isNaN(d.getTime())) since = d;
  }
  try {
    const page = await listPublicDirectoryPhoneSync({ since, cursor, limit });
    return c.json({ status: "success", ...page }, 200, {
      "Cache-Control": "private, max-age=120"
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "디렉터리 동기화 실패";
    return c.json({ status: "error", message }, 500);
  }
});
