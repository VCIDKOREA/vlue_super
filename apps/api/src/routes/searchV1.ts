import { Hono } from "hono";
import { runPublicBusinessSearch } from "../services/search/publicBusinessSearchService.js";
import { runSearchVerify } from "../services/search/searchVerifyService.js";

export const searchV1Routes = new Hono();

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache"
} as const;

/** GET /api/v1/search/verify?keyword=구미세무서 */
searchV1Routes.get("/verify", async (c) => {
  const keyword = c.req.query("keyword")?.trim() || c.req.query("q")?.trim() || "";
  const userLatitude = Number(c.req.query("user_lat") || c.req.query("lat"));
  const userLongitude = Number(c.req.query("user_lng") || c.req.query("lng"));
  if (!keyword) {
    return c.json({ status: "error", message: "keyword 쿼리 파라미터가 필요합니다." }, 400);
  }

  try {
    const result = await runSearchVerify(keyword, {
      userLatitude: Number.isFinite(userLatitude) ? userLatitude : null,
      userLongitude: Number.isFinite(userLongitude) ? userLongitude : null
    });
    if (result.status === "error") {
      return c.json(result, 404);
    }
    return c.json(result, 200, NO_STORE_HEADERS);
  } catch (e) {
    const message = e instanceof Error ? e.message : "검증 처리 중 오류가 발생했습니다.";
    return c.json({ status: "error", message }, 500);
  }
});

/**
 * GET /api/v1/search/business?keyword=상호명
 * 공공데이터포털 기업·사업자 정보(금융위·소상공인·국세청) 상호명 실시간 조회
 */
searchV1Routes.get("/business", async (c) => {
  const keyword = c.req.query("keyword")?.trim() || c.req.query("q")?.trim() || "";
  const userLatitude = Number(c.req.query("user_lat") || c.req.query("lat"));
  const userLongitude = Number(c.req.query("user_lng") || c.req.query("lng"));
  if (!keyword) {
    return c.json({ status: "error", message: "keyword 쿼리 파라미터가 필요합니다." }, 400);
  }

  try {
    const data = await runPublicBusinessSearch(keyword, {
      latitude: Number.isFinite(userLatitude) ? userLatitude : null,
      longitude: Number.isFinite(userLongitude) ? userLongitude : null
    });
    return c.json({ status: "success", data }, 200, NO_STORE_HEADERS);
  } catch (e) {
    const message = e instanceof Error ? e.message : "사업자 조회 중 오류가 발생했습니다.";
    return c.json({ status: "error", message }, 500);
  }
});
