import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { allowVmingRequest } from "../services/vming/vmingUsageService.js";
import {
  listOfficePptTasks,
  updateOfficePptTaskMock
} from "../services/office/officePptTaskService.js";

/**
 * 레거시 `/api/ppt/jobs` — 오피스 PPT 파이프라인(`web_ppt`)으로 단일화
 */
export const pptRoutes = new Hono();
pptRoutes.use("*", requireUserHeader);

async function gateWebPpt(userId: string, c: { json: (body: unknown, status?: number) => Response }) {
  const gate = await allowVmingRequest({
    userId,
    featureType: "web_ppt",
    intentType: "summary_ppt",
    message: "ppt-job"
  });
  if (!gate.allowed) {
    return c.json(
      {
        ok: false,
        code: gate.code,
        blocked_reason_type: "PROJECT_LIMIT_EXCEEDED",
        message:
          "오늘 제공된 무료 체험 한도를 모두 소모하셨습니다. 환율 상승에도 부담 없는 가격! 월 4,900원 무제한 패키지로 VLUE의 모든 AI 기능을 제한 없이 고용해 보세요!",
        openUnlimitedPurchase: true,
        redirect: "/api/office/ppt-tasks/mock-progress"
      },
      429
    );
  }
  return null;
}

pptRoutes.post("/jobs", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const blocked = await gateWebPpt(userId, c);
  if (blocked) return blocked;

  const body = (await c.req.json<{ title?: string }>().catch(() => ({}))) as { title?: string };
  const task = await updateOfficePptTaskMock({
    userId,
    projectTitle: String(body?.title || "AI PPT"),
    progress: 0,
    status: "PENDING"
  });
  return c.json({ ok: true, job: task, unified: "office-ppt-tasks" });
});

pptRoutes.post("/jobs/:id/progress", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = (await c.req.json<{ progress?: number; status?: string }>().catch(() => ({}))) as {
    progress?: number;
    status?: string;
  };
  const task = await updateOfficePptTaskMock({
    userId,
    taskId: c.req.param("id"),
    progress: Number(body?.progress) || 0,
    status: body?.status
  });
  if (!task) return c.json({ error: "job not found" }, 404);
  return c.json({ ok: true, job: task, unified: "office-ppt-tasks" });
});

pptRoutes.get("/jobs/:id", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const tasks = await listOfficePptTasks(userId, 200);
  const row = tasks.find((t) => t.id === c.req.param("id"));
  if (!row) return c.json({ error: "job not found" }, 404);
  return c.json({ ok: true, job: row, unified: "office-ppt-tasks" });
});
