import {
  createEmptyWorkbookModel,
  parseWorkbookModel,
  safeParseWorkbookModel,
  type VlueWorkbookModel
} from "@vlue/shared/excel";
import type { ExcelGenerationStatus, ExcelWorkbookStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../db/client.js";
import { runMockExcelGenerationAgent } from "./generationAgent.service.js";
import { listExcelTemplates, resolveTemplateModel } from "./templateResolver.js";

export { listExcelTemplates, resolveTemplateModel };

export function mapWorkbookRow(row: {
  id: string;
  ownerUserId: string;
  title: string;
  templateId: string | null;
  status: ExcelWorkbookStatus;
  headRevisionId: string | null;
  headRevisionNum: number;
  lastExportedAssetId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    title: row.title,
    templateId: row.templateId,
    status: row.status,
    headRevisionId: row.headRevisionId,
    headRevisionNum: row.headRevisionNum,
    lastExportedAssetId: row.lastExportedAssetId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function mapGenerationJobRow(row: {
  id: string;
  workbookId: string | null;
  ownerUserId: string;
  promptText: string;
  templateId: string | null;
  status: ExcelGenerationStatus;
  progress: number;
  resultRevisionId: string | null;
  errorMessage: string | null;
  agentTraceJson: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    workbookId: row.workbookId,
    ownerUserId: row.ownerUserId,
    promptText: row.promptText,
    templateId: row.templateId,
    status: row.status,
    progress: row.progress,
    resultRevisionId: row.resultRevisionId,
    errorMessage: row.errorMessage,
    agentTraceJson: row.agentTraceJson,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function createExcelWorkbook(input: {
  ownerUserId: string;
  title?: string;
  templateId?: string | null;
  authorClient?: string;
}) {
  const title = String(input.title || "새 엑셀 워크북").slice(0, 300);
  const templateId = String(input.templateId || "").trim() || null;

  let model = createEmptyWorkbookModel(title);
  if (templateId) {
    const tpl = await resolveTemplateModel(templateId);
    if (tpl) {
      model = parseWorkbookModel({
        ...tpl,
        meta: { ...tpl.meta, title, createdBy: "user" as const }
      });
    }
  } else {
    model.meta.title = title;
  }

  const wb = await prisma.officeExcelWorkbook.create({
    data: {
      ownerUserId: input.ownerUserId,
      title,
      templateId,
      status: "draft"
    }
  });

  const revision = await prisma.officeExcelRevision.create({
    data: {
      workbookId: wb.id,
      revisionNum: 1,
      modelJson: model as object,
      changeSummary: templateId ? `템플릿 ${templateId}으로 생성` : "빈 워크북 생성",
      authorUserId: input.ownerUserId,
      authorClient: input.authorClient || "web"
    }
  });

  const updated = await prisma.officeExcelWorkbook.update({
    where: { id: wb.id },
    data: {
      headRevisionId: revision.id,
      headRevisionNum: 1,
      status: "active"
    }
  });

  return {
    workbook: mapWorkbookRow(updated),
    revision: {
      id: revision.id,
      revisionNum: 1,
      model
    }
  };
}

export async function listExcelWorkbooks(ownerUserId: string, limit = 50) {
  const rows = await prisma.officeExcelWorkbook.findMany({
    where: { ownerUserId },
    orderBy: { updatedAt: "desc" },
    take: limit
  });
  return rows.map(mapWorkbookRow);
}

export async function getExcelWorkbookById(ownerUserId: string, workbookId: string) {
  const wb = await prisma.officeExcelWorkbook.findFirst({
    where: { id: workbookId, ownerUserId }
  });
  if (!wb) return null;

  let headModel: VlueWorkbookModel | null = null;
  if (wb.headRevisionId) {
    const rev = await prisma.officeExcelRevision.findFirst({
      where: { id: wb.headRevisionId, workbookId: wb.id }
    });
    if (rev) {
      const parsed = safeParseWorkbookModel(rev.modelJson);
      if (parsed.success) headModel = parsed.data;
    }
  }

  return {
    workbook: mapWorkbookRow(wb),
    model: headModel
  };
}

export async function startMockExcelGeneration(input: {
  ownerUserId: string;
  promptText: string;
  templateId?: string | null;
  workbookId?: string | null;
}) {
  const promptText = String(input.promptText || "").trim();
  if (!promptText) throw new Error("PROMPT_REQUIRED");

  const job = await prisma.officeExcelGenerationJob.create({
    data: {
      ownerUserId: input.ownerUserId,
      promptText,
      templateId: input.templateId || null,
      workbookId: input.workbookId || null,
      status: "PENDING",
      progress: 0
    }
  });

  try {
    const result = await runMockExcelGenerationAgent({
      jobId: job.id,
      ownerUserId: input.ownerUserId,
      promptText,
      templateId: input.templateId,
      workbookId: input.workbookId
    });

    const fresh = await prisma.officeExcelGenerationJob.findUnique({
      where: { id: job.id }
    });

    return {
      job: fresh ? mapGenerationJobRow(fresh) : mapGenerationJobRow(job),
      ...result
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "GENERATION_FAILED";
    await prisma.officeExcelGenerationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message.slice(0, 500) }
    });
    throw e;
  }
}

export async function getExcelGenerationJob(ownerUserId: string, jobId: string) {
  const job = await prisma.officeExcelGenerationJob.findFirst({
    where: { id: jobId, ownerUserId }
  });
  return job ? mapGenerationJobRow(job) : null;
}

/** 웹 에디터 — head revision 갱신 (낙관적 잠금) */
export async function saveExcelWorkbookRevision(input: {
  ownerUserId: string;
  workbookId: string;
  baseRevisionNum: number;
  model: VlueWorkbookModel;
  changeSummary?: string;
  authorClient?: string;
}) {
  const wb = await prisma.officeExcelWorkbook.findFirst({
    where: { id: input.workbookId, ownerUserId: input.ownerUserId }
  });
  if (!wb) throw new Error("WORKBOOK_NOT_FOUND");

  if (wb.headRevisionNum !== input.baseRevisionNum) {
    const err = new Error("REVISION_CONFLICT") as Error & { statusCode?: number };
    err.statusCode = 409;
    throw err;
  }

  const parsed = parseWorkbookModel(input.model);
  const nextRev = wb.headRevisionNum + 1;

  const revision = await prisma.officeExcelRevision.create({
    data: {
      workbookId: wb.id,
      revisionNum: nextRev,
      parentRevisionId: wb.headRevisionId,
      modelJson: parsed as object,
      changeSummary: input.changeSummary || `웹 편집 저장 (rev ${nextRev})`,
      authorUserId: input.ownerUserId,
      authorClient: input.authorClient || "web"
    }
  });

  const updated = await prisma.officeExcelWorkbook.update({
    where: { id: wb.id },
    data: {
      headRevisionId: revision.id,
      headRevisionNum: nextRev,
      title: parsed.meta.title.slice(0, 300),
      status: "active"
    }
  });

  return {
    workbook: mapWorkbookRow(updated),
    revisionNum: nextRev,
    model: parsed
  };
}
