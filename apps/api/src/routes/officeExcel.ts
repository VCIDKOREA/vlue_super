import { Hono } from "hono";
import {
  createExcelWorkbook,
  getExcelGenerationJob,
  getExcelWorkbookById,
  listExcelTemplates,
  listExcelWorkbooks,
  saveExcelWorkbookRevision,
  startMockExcelGeneration
} from "../services/office/excel/workbook.service.js";
import { safeParseWorkbookModel } from "@vlue/shared/excel";

export const officeExcelRoutes = new Hono();

/** GET /api/office/excel/templates */
officeExcelRoutes.get("/templates", async (c) => {
  try {
    const templates = await listExcelTemplates();
    return c.json({ ok: true, templates });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** GET /api/office/excel/workbooks */
officeExcelRoutes.get("/workbooks", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const workbooks = await listExcelWorkbooks(userId, 60);
    return c.json({ ok: true, workbooks });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** POST /api/office/excel/workbooks */
officeExcelRoutes.post("/workbooks", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json<{ title?: string; templateId?: string }>().catch(
      () => ({}) as { title?: string; templateId?: string }
    )) as { title?: string; templateId?: string };
    const result = await createExcelWorkbook({
      ownerUserId: userId,
      title: body.title,
      templateId: body.templateId,
      authorClient: "web"
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** GET /api/office/excel/workbooks/:id */
officeExcelRoutes.get("/workbooks/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const workbookId = c.req.param("id");
    const data = await getExcelWorkbookById(userId, workbookId);
    if (!data) return c.json({ error: "WORKBOOK_NOT_FOUND" }, 404);
    return c.json({ ok: true, ...data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** POST /api/office/excel/workbooks/generate — Mock Agent */
officeExcelRoutes.post("/workbooks/generate", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      prompt?: string;
      promptText?: string;
      templateId?: string;
      workbookId?: string;
    }>();
    const promptText = String(body?.promptText || body?.prompt || "").trim();
    const result = await startMockExcelGeneration({
      ownerUserId: userId,
      promptText,
      templateId: body?.templateId,
      workbookId: body?.workbookId
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const code = message === "PROMPT_REQUIRED" ? 400 : 500;
    return c.json({ error: message }, code);
  }
});

/** PUT /api/office/excel/workbooks/:id — 모델 저장 */
officeExcelRoutes.put("/workbooks/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const workbookId = c.req.param("id");
    const body = await c.req.json<{
      baseRevisionNum?: number;
      model?: unknown;
      changeSummary?: string;
    }>();
    const parsed = safeParseWorkbookModel(body?.model);
    if (!parsed.success) {
      return c.json({ error: "INVALID_WORKBOOK_MODEL", details: parsed.error.flatten() }, 400);
    }
    const baseRevisionNum = Math.floor(Number(body?.baseRevisionNum) || 0);
    const result = await saveExcelWorkbookRevision({
      ownerUserId: userId,
      workbookId,
      baseRevisionNum,
      model: parsed.data,
      changeSummary: body?.changeSummary
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const status =
      message === "WORKBOOK_NOT_FOUND"
        ? 404
        : message === "REVISION_CONFLICT"
          ? 409
          : 400;
    if (status === 409) {
      const userId = c.get("vlueUserId") as string;
      const data = await getExcelWorkbookById(userId, c.req.param("id"));
      return c.json({ error: message, current: data }, 409);
    }
    return c.json({ error: message }, status);
  }
});

/** GET /api/office/excel/generation-jobs/:id */
officeExcelRoutes.get("/generation-jobs/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const jobId = c.req.param("id");
    const job = await getExcelGenerationJob(userId, jobId);
    if (!job) return c.json({ error: "JOB_NOT_FOUND" }, 404);
    return c.json({ ok: true, job });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});
