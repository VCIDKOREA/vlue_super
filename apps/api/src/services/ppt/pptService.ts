import { ssePublish } from "../../realtime/sseHub.js";

type PptJob = {
  id: string;
  userId: string;
  title: string;
  status: "queued" | "running" | "done";
  progress: number;
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, PptJob>();

export function createPptJob(userId: string, title: string) {
  const now = new Date().toISOString();
  const row: PptJob = {
    id: crypto.randomUUID(),
    userId,
    title,
    status: "queued",
    progress: 0,
    createdAt: now,
    updatedAt: now
  };
  jobs.set(row.id, row);
  return row;
}

export function updatePptJobProgress(jobId: string, userId: string, progress: number) {
  const row = jobs.get(jobId);
  if (!row) return null;
  row.progress = Math.min(100, Math.max(0, Math.floor(progress)));
  row.status = row.progress >= 100 ? "done" : "running";
  row.updatedAt = new Date().toISOString();
  jobs.set(jobId, row);
  ssePublish(userId, {
    type: "ppt.job.progress",
    jobId: row.id,
    progress: row.progress,
    status: row.status
  });
  return row;
}

export function getPptJob(jobId: string) {
  return jobs.get(jobId) || null;
}

