import { Hono } from "hono";
import { verifyCopyrightRegistration } from "../integrations/publicData/copyrightRegistrationClient.js";
import { requireUserHeader } from "../middleware/cardGate.js";

/**
 * GET /api/v1/copyright/verify?title=&author=&registrationNo=
 *
 * Env:
 *   COPYRIGHT_API_KEY (우선) 또는 PUBLIC_DATA_SERVICE_KEY
 *   COPYRIGHT_API_BASE_URL / COPYRIGHT_API_LIST_PATH (선택)
 */
export const copyrightV1Routes = new Hono();

copyrightV1Routes.get("/verify", requireUserHeader, async (c) => {
  const title = String(c.req.query("title") || "").trim();
  const author = String(c.req.query("author") || "").trim();
  const registrationNo = String(c.req.query("registrationNo") || c.req.query("regNo") || "").trim();
  const pageNo = Number(c.req.query("pageNo") || 1);
  const numOfRows = Number(c.req.query("numOfRows") || 10);

  const result = await verifyCopyrightRegistration({
    title,
    author,
    registrationNo,
    pageNo,
    numOfRows
  });

  if (!result.configured) {
    return c.json(result, 503);
  }
  if (!result.ok && result.message?.includes("입력")) {
    return c.json(result, 400);
  }
  if (!result.ok) {
    return c.json(result, 502);
  }
  return c.json(result);
});
