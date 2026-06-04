import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import {
  ingestPptVaultBuffer,
  markPptGeneratedFileName
} from "./officeVaultIngest.js";

export type PptTaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

let initialized = false;

async function ensurePptTasksTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS office_ppt_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      project_title VARCHAR(300) NOT NULL,
      progress INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      result_file_url VARCHAR(1000),
      asset_file_id UUID,
      error_message VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_office_ppt_tasks_user ON office_ppt_tasks(user_id, updated_at DESC);"
  );
  initialized = true;
}

export function normalizePptStatus(raw: string | undefined, progress: number): PptTaskStatus {
  const s = String(raw || "").toUpperCase();
  if (s === "FAILED") return "FAILED";
  if (s === "COMPLETED" || s === "DONE") return "COMPLETED";
  if (s === "PROCESSING" || s === "RUNNING") return "PROCESSING";
  if (s === "PENDING" || s === "QUEUED") return "PENDING";
  if (progress >= 100) return "COMPLETED";
  if (progress > 0) return "PROCESSING";
  return "PENDING";
}

function mockPptxBuffer() {
  return Buffer.from("VLUE AI PPT MOCK OUTPUT", "utf8");
}

async function resolveResultBuffer(input: {
  resultFileUrl?: string;
  resultFileBase64?: string;
}) {
  const b64 = String(input.resultFileBase64 || "").trim();
  if (b64) return Buffer.from(b64.replace(/\s/g, ""), "base64");
  const url = String(input.resultFileUrl || "").trim();
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("RESULT_DOWNLOAD_FAILED");
    return Buffer.from(await res.arrayBuffer());
  }
  return mockPptxBuffer();
}

async function ingestCompletedPpt(input: {
  userId: string;
  projectTitle: string;
  resultFileUrl?: string;
  resultFileBase64?: string;
  resultFileName?: string;
}) {
  const buffer = await resolveResultBuffer(input);
  const baseName = input.resultFileName || `${input.projectTitle || "presentation"}.pptx`;
  const fileName = markPptGeneratedFileName(baseName);
  const asset = await ingestPptVaultBuffer({
    userId: input.userId,
    fileName,
    buffer
  });
  return { asset, fileUrl: asset.fileUrl };
}

type TaskRow = {
  id: string;
  user_id: string;
  project_title: string;
  progress: number;
  status: string;
  result_file_url: string | null;
  asset_file_id: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

export function mapPptTaskRow(row: TaskRow) {
  return {
    id: row.id,
    userId: row.user_id,
    projectTitle: row.project_title,
    progress: row.progress,
    status: row.status as PptTaskStatus,
    resultFileUrl: row.result_file_url,
    assetFileId: row.asset_file_id,
    errorMessage: row.error_message,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export async function listOfficePptTasks(userId: string, limit = 50) {
  await ensurePptTasksTable();
  const rows = await prisma.$queryRawUnsafe<TaskRow[]>(
    `
      SELECT id, user_id, project_title, progress, status, result_file_url,
             asset_file_id, error_message, created_at, updated_at
      FROM office_ppt_tasks
      WHERE user_id = $1::uuid
      ORDER BY updated_at DESC
      LIMIT $2;
    `,
    userId,
    limit
  );
  return rows.map(mapPptTaskRow);
}

async function getTaskForUser(taskId: string, userId: string) {
  await ensurePptTasksTable();
  const rows = await prisma.$queryRawUnsafe<TaskRow[]>(
    `
      SELECT id, user_id, project_title, progress, status, result_file_url,
             asset_file_id, error_message, created_at, updated_at
      FROM office_ppt_tasks
      WHERE id = $1::uuid AND user_id = $2::uuid
      LIMIT 1;
    `,
    taskId,
    userId
  );
  return rows[0] || null;
}

function publishPptProgress(userId: string, task: ReturnType<typeof mapPptTaskRow>) {
  ssePublish(userId, {
    type: "vlue-office-ppt-progress",
    taskId: task.id,
    projectTitle: task.projectTitle,
    progress: task.progress,
    status: task.status,
    resultFileUrl: task.resultFileUrl,
    assetFileId: task.assetFileId,
    at: new Date().toISOString()
  });
  ssePublish(userId, {
    type: "ppt.job.progress",
    jobId: task.id,
    progress: task.progress,
    status:
      task.status === "COMPLETED"
        ? "done"
        : task.status === "FAILED"
          ? "failed"
          : task.status === "PROCESSING"
            ? "running"
            : "queued"
  });
}

export async function updateOfficePptTaskMock(input: {
  userId: string;
  taskId?: string;
  projectTitle?: string;
  progress?: number;
  status?: string;
  resultFileUrl?: string;
  resultFileName?: string;
  resultFileBase64?: string;
  errorMessage?: string;
}) {
  await ensurePptTasksTable();
  let taskId = String(input.taskId || "").trim();
  const progress = Math.min(100, Math.max(0, Math.floor(Number(input.progress) || 0)));
  let status = normalizePptStatus(input.status, progress);
  const title = String(input.projectTitle || "AI PPT 프로젝트").slice(0, 300);

  if (!taskId) {
    const created = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO office_ppt_tasks (user_id, project_title, progress, status)
        VALUES ($1::uuid, $2, $3, $4)
        RETURNING id;
      `,
      input.userId,
      title,
      progress,
      status
    );
    taskId = created[0]?.id || "";
    if (!taskId) throw new Error("TASK_CREATE_FAILED");
  }

  const existing = await getTaskForUser(taskId, input.userId);
  if (!existing) throw new Error("TASK_NOT_FOUND");

  let resultFileUrl = String(input.resultFileUrl || existing.result_file_url || "").trim() || null;
  let assetFileId = existing.asset_file_id;
  const errMsg = input.errorMessage || null;

  if (status === "FAILED") {
    await prisma.$executeRawUnsafe(
      `
        UPDATE office_ppt_tasks
        SET progress = $3, status = $4, error_message = $5, updated_at = NOW()
        WHERE id = $1::uuid AND user_id = $2::uuid;
      `,
      taskId,
      input.userId,
      progress,
      status,
      errMsg
    );
  } else if (status === "COMPLETED") {
    if (!assetFileId) {
      const ingested = await ingestCompletedPpt({
        userId: input.userId,
        projectTitle: title || existing.project_title,
        resultFileUrl: resultFileUrl || undefined,
        resultFileBase64: input.resultFileBase64,
        resultFileName: input.resultFileName
      });
      resultFileUrl = ingested.fileUrl;
      assetFileId = ingested.asset.id;
    }
    await prisma.$executeRawUnsafe(
      `
        UPDATE office_ppt_tasks
        SET progress = 100, status = 'COMPLETED', result_file_url = $3,
            asset_file_id = $4::uuid, error_message = NULL, updated_at = NOW()
        WHERE id = $1::uuid AND user_id = $2::uuid;
      `,
      taskId,
      input.userId,
      resultFileUrl,
      assetFileId
    );
    status = "COMPLETED";
  } else {
    await prisma.$executeRawUnsafe(
      `
        UPDATE office_ppt_tasks
        SET project_title = COALESCE(NULLIF($3, ''), project_title),
            progress = $4, status = $5,
            result_file_url = COALESCE($6, result_file_url),
            error_message = NULL, updated_at = NOW()
        WHERE id = $1::uuid AND user_id = $2::uuid;
      `,
      taskId,
      input.userId,
      title,
      progress,
      status,
      resultFileUrl
    );
  }

  const row = await getTaskForUser(taskId, input.userId);
  if (!row) throw new Error("TASK_NOT_FOUND");
  const mapped = mapPptTaskRow(row);
  publishPptProgress(input.userId, mapped);
  return mapped;
}
