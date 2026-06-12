import { Hono } from "hono";
import { runSearchVerify } from "../services/search/searchVerifyService.js";

export const searchV1Routes = new Hono();

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
    return c.json(result, 200, {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache"
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "검증 처리 중 오류가 발생했습니다.";
    return c.json({ status: "error", message }, 500);
  }
});
