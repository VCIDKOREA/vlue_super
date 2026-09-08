import { randomUUID } from "crypto";
import { prisma } from "../../db/client.js";

export type JobOccupationReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

let initialized = false;

export async function ensureJobOccupationReviewTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS job_occupation_verification_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      digital_card_id UUID,
      occupation_id VARCHAR(64) NOT NULL,
      occupation_label VARCHAR(120) NOT NULL,
      custom_label VARCHAR(120),
      doc_kind VARCHAR(60) NOT NULL,
      doc_url TEXT,
      doc_data_url TEXT,
      doc_file_name VARCHAR(255),
      review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      admin_note VARCHAR(500),
      reviewed_by_admin_device_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_job_occ_reviews_user ON job_occupation_verification_reviews(user_id, created_at DESC);"
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_job_occ_reviews_status ON job_occupation_verification_reviews(review_status, created_at DESC);"
  );
  initialized = true;
}

export function buildJobOccupationDocUrl(userId: string, kind: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `https://storage.vlue.mock/job-occupation/${userId}/${kind}/${randomUUID()}-${safe}`;
}

export async function insertJobOccupationReview(input: {
  userId: string;
  digitalCardId?: string | null;
  occupationId: string;
  occupationLabel: string;
  customLabel?: string | null;
  docKind: string;
  docUrl: string;
  docDataUrl?: string | null;
  docFileName: string;
  reviewStatus?: JobOccupationReviewStatus;
}) {
  await ensureJobOccupationReviewTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO job_occupation_verification_reviews (
        user_id, digital_card_id, occupation_id, occupation_label, custom_label,
        doc_kind, doc_url, doc_data_url, doc_file_name, review_status
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id;
    `,
    input.userId,
    input.digitalCardId || null,
    input.occupationId,
    input.occupationLabel,
    input.customLabel || null,
    input.docKind,
    input.docUrl,
    input.docDataUrl || null,
    input.docFileName,
    input.reviewStatus || "PENDING"
  );
  return rows[0]?.id || null;
}

export async function getLatestJobOccupationReviewForUser(userId: string) {
  await ensureJobOccupationReviewTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      occupation_id: string;
      occupation_label: string;
      custom_label: string | null;
      doc_kind: string;
      doc_file_name: string | null;
      review_status: string;
      admin_note: string | null;
      created_at: Date;
      updated_at: Date;
    }>
  >(
    `
      SELECT id, user_id, occupation_id, occupation_label, custom_label,
             doc_kind, doc_file_name, review_status, admin_note, created_at, updated_at
      FROM job_occupation_verification_reviews
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 1;
    `,
    userId
  );
  return rows[0] || null;
}

export async function listPendingJobOccupationReviews(limit = 50) {
  await ensureJobOccupationReviewTable();
  const take = Math.min(100, Math.max(1, limit));
  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      occupation_id: string;
      occupation_label: string;
      custom_label: string | null;
      doc_kind: string;
      doc_file_name: string | null;
      doc_data_url: string | null;
      doc_url: string | null;
      review_status: string;
      created_at: Date;
    }>
  >(
    `
      SELECT id, user_id, occupation_id, occupation_label, custom_label,
             doc_kind, doc_file_name, doc_data_url, doc_url, review_status, created_at
      FROM job_occupation_verification_reviews
      WHERE review_status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT ${take};
    `
  );
}

export async function resolveJobOccupationReview(input: {
  reviewId: string;
  action: "approve" | "reject";
  adminDeviceId?: string | null;
  adminNote?: string;
}) {
  await ensureJobOccupationReviewTable();
  const status = input.action === "reject" ? "REJECTED" : "APPROVED";
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; user_id: string }>>(
    `
      UPDATE job_occupation_verification_reviews
      SET review_status = $2,
          admin_note = $3,
          reviewed_by_admin_device_id = $4::uuid,
          updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id, user_id;
    `,
    input.reviewId,
    status,
    String(input.adminNote || "").trim().slice(0, 500) || null,
    input.adminDeviceId || null
  );
  return rows[0] || null;
}
