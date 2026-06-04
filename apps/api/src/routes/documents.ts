import { Hono } from "hono";
import { listDocumentTemplates } from "../data/documentTemplatesCatalog.js";

export const documentsRoutes = new Hono();

/**
 * GET /api/documents/templates?category=all|business|life|legal_other
 * 일반(Free) 회원도 조회 가능. isPaidOnly 로 향후 유료 전용 분기.
 */
documentsRoutes.get("/templates", (c) => {
  const category = c.req.query("category") || "all";
  return c.json(listDocumentTemplates(category));
});
