import { Hono } from "hono";
import { runSearchVerify } from "../services/search/searchVerifyService.js";

export const searchV1Routes = new Hono();

/** GET /api/v1/search/verify?keyword=구미세무서 */
searchV1Routes.get("/verify", async (c) => {
  const keyword = c.req.query("keyword")?.trim() || c.req.query("q")?.trim() || "";
  if (!keyword) {
    return c.json({ status: "error", message: "keyword 쿼리 파라미터가 필요합니다." }, 400);
  }

  try {
    const result = await runSearchVerify(keyword);
    if (result.status === "error") {
      return c.json(result, 404);
    }
    return c.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "검증 처리 중 오류가 발생했습니다.";
    return c.json({ status: "error", message }, 500);
  }
});
