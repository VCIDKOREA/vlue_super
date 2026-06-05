import {
  createEmptyWorkbookModel,
  parseWorkbookModel,
  type VlueWorkbookModel
} from "@vlue/shared/excel";
import { getFallbackTemplateById } from "../../../data/officeExcelTemplatesCatalog.js";
import { prisma } from "../../../db/client.js";
import { ssePublish } from "../../../realtime/sseHub.js";
import { resolveTemplateModel } from "./templateResolver.js";

export type MockAgentTrace = {
  steps: Array<{ name: string; detail: string; at: string }>;
  matchedTemplateId: string | null;
  promptPreview: string;
};

function matchTemplateFromPrompt(prompt: string): string | null {
  const p = prompt.toLowerCase();
  if (/공구|주문.?취합|취합표/.test(p)) return "group_buy_order_v1";
  if (/입금|대조|정산/.test(p)) return "payment_reconcile_v1";
  return null;
}

async function loadModelForTemplate(templateId: string): Promise<VlueWorkbookModel> {
  const fromDb = await resolveTemplateModel(templateId);
  if (fromDb) return fromDb;
  const fallback = getFallbackTemplateById(templateId);
  if (fallback) return parseWorkbookModel(fallback.model);
  return createEmptyWorkbookModel("AI 생성 워크북");
}

/**
 * LLM 연동 전 Mock Agent — 프롬프트 → 템플릿 매칭 → WorkbookModel JSON
 */
export async function runMockExcelGenerationAgent(input: {
  jobId: string;
  ownerUserId: string;
  promptText: string;
  templateId?: string | null;
  workbookId?: string | null;
}) {
  const trace: MockAgentTrace = {
    steps: [],
    matchedTemplateId: null,
    promptPreview: input.promptText.slice(0, 200)
  };

  const pushStep = (name: string, detail: string) => {
    trace.steps.push({ name, detail, at: new Date().toISOString() });
  };

  pushStep("intent", "프롬프트 의도 분류 (mock)");
  const matched =
    String(input.templateId || "").trim() ||
    matchTemplateFromPrompt(input.promptText) ||
    "group_buy_order_v1";
  trace.matchedTemplateId = matched;

  pushStep("template_match", `템플릿: ${matched}`);
  const model = await loadModelForTemplate(matched);
  model.meta.title =
    input.promptText.slice(0, 80).trim() || model.meta.title || "AI 엑셀 워크북";
  model.meta.createdBy = "ai";
  model.meta.templateId = matched;

  pushStep("validate", "Zod 스키마 검증 통과");
  const parsed = parseWorkbookModel(model);

  await prisma.officeExcelGenerationJob.update({
    where: { id: input.jobId },
    data: { status: "PROCESSING", progress: 40, agentTraceJson: trace as object }
  });

  ssePublish(input.ownerUserId, {
    type: "excel.generation.progress",
    jobId: input.jobId,
    progress: 40,
    status: "PROCESSING"
  });

  let workbookId = String(input.workbookId || "").trim();

  if (!workbookId) {
    const wb = await prisma.officeExcelWorkbook.create({
      data: {
        ownerUserId: input.ownerUserId,
        title: parsed.meta.title.slice(0, 300),
        templateId: matched,
        status: "active"
      }
    });
    workbookId = wb.id;
    await prisma.officeExcelGenerationJob.update({
      where: { id: input.jobId },
      data: { workbookId }
    });
  }

  const wbRow = await prisma.officeExcelWorkbook.findFirst({
    where: { id: workbookId, ownerUserId: input.ownerUserId }
  });
  if (!wbRow) throw new Error("WORKBOOK_NOT_FOUND");

  const nextRev = wbRow.headRevisionNum + 1;
  const revision = await prisma.officeExcelRevision.create({
    data: {
      workbookId,
      revisionNum: nextRev,
      parentRevisionId: wbRow.headRevisionId,
      modelJson: parsed as object,
      changeSummary: `Mock AI 생성 (rev ${nextRev})`,
      authorUserId: input.ownerUserId,
      authorClient: "web"
    }
  });

  await prisma.officeExcelWorkbook.update({
    where: { id: workbookId },
    data: {
      headRevisionId: revision.id,
      headRevisionNum: nextRev,
      title: parsed.meta.title.slice(0, 300),
      templateId: matched,
      status: "active"
    }
  });

  pushStep("persist", `revision #${nextRev}`);

  await prisma.officeExcelGenerationJob.update({
    where: { id: input.jobId },
    data: {
      status: "COMPLETED",
      progress: 100,
      resultRevisionId: revision.id,
      agentTraceJson: trace as object
    }
  });

  ssePublish(input.ownerUserId, {
    type: "excel.generation.progress",
    jobId: input.jobId,
    progress: 100,
    status: "COMPLETED",
    workbookId
  });

  ssePublish(input.ownerUserId, {
    type: "excel.workbook.updated",
    workbookId,
    revisionNum: nextRev
  });

  return { workbookId, revisionId: revision.id, revisionNum: nextRev, model: parsed, trace };
}
