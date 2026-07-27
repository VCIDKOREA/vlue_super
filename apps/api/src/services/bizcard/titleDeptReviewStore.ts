import { randomUUID } from "crypto";
import { prisma } from "../../db/client.js";

export type TitleDeptReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TitleDeptReviewSource = "bizcard_settings" | "onboarding_signup";

let initialized = false;

export async function ensureTitleDeptReviewTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS title_dept_verification_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      digital_card_id UUID,
      source VARCHAR(40) NOT NULL DEFAULT 'bizcard_settings',
      pending_title VARCHAR(120),
      pending_department VARCHAR(120),
      approved_title VARCHAR(120),
      approved_department VARCHAR(120),
      doc_kind VARCHAR(60),
      doc_url TEXT,
      doc_data_url TEXT,
      doc_file_name VARCHAR(255),
      doc_issued_at DATE,
      review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      admin_note VARCHAR(500),
      reviewed_by_admin_device_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_title_dept_reviews_user ON title_dept_verification_reviews(user_id, created_at DESC);"
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_title_dept_reviews_status ON title_dept_verification_reviews(review_status, created_at DESC);"
  );
  initialized = true;
}

export function buildTitleDeptDocUrl(userId: string, kind: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `https://storage.vlue.mock/title-dept/${userId}/${kind}/${randomUUID()}-${safe}`;
}

export async function insertTitleDeptReview(input: {
  userId: string;
  digitalCardId?: string | null;
  source: TitleDeptReviewSource;
  pendingTitle?: string;
  pendingDepartment?: string;
  docKind: string;
  docUrl: string;
  docDataUrl?: string | null;
  docFileName: string;
  docIssuedAt: string;
  reviewStatus?: TitleDeptReviewStatus;
}) {
  await ensureTitleDeptReviewTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO title_dept_verification_reviews (
        user_id, digital_card_id, source, pending_title, pending_department,
        doc_kind, doc_url, doc_data_url, doc_file_name, doc_issued_at, review_status
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::date, $11)
      RETURNING id;
    `,
    input.userId,
    input.digitalCardId || null,
    input.source,
    input.pendingTitle || null,
    input.pendingDepartment || null,
    input.docKind,
    input.docUrl,
    input.docDataUrl || null,
    input.docFileName,
    input.docIssuedAt,
    input.reviewStatus || "PENDING"
  );
  return rows[0]?.id || null;
}

export async function getLatestTitleDeptReviewForUser(userId: string) {
  await ensureTitleDeptReviewTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      digital_card_id: string | null;
      source: string;
      pending_title: string | null;
      pending_department: string | null;
      approved_title: string | null;
      approved_department: string | null;
      doc_kind: string | null;
      doc_file_name: string | null;
      doc_issued_at: Date | null;
      review_status: string;
      admin_note: string | null;
      created_at: Date;
      updated_at: Date;
    }>
  >(
    `
      SELECT id, user_id, digital_card_id, source, pending_title, pending_department,
             approved_title, approved_department, doc_kind, doc_file_name, doc_issued_at,
             review_status, admin_note, created_at, updated_at
      FROM title_dept_verification_reviews
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 1;
    `,
    userId
  );
  return rows[0] || null;
}

export async function listPendingTitleDeptReviews(limit = 100) {
  await ensureTitleDeptReviewTable();
  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      source: string;
      pending_title: string | null;
      pending_department: string | null;
      approved_title: string | null;
      approved_department: string | null;
      doc_kind: string | null;
      doc_url: string | null;
      doc_data_url: string | null;
      doc_file_name: string | null;
      doc_issued_at: Date | null;
      review_status: string;
      created_at: Date;
      legal_name: string | null;
      public_handle: string | null;
    }>
  >(
    `
      SELECT r.id, r.user_id, r.source, r.pending_title, r.pending_department,
             r.approved_title, r.approved_department, r.doc_kind, r.doc_url,
             CASE
               WHEN r.doc_data_url IS NULL OR r.doc_data_url = '' THEN NULL
               ELSE 'stored'
             END AS doc_data_url,
             r.doc_file_name, r.doc_issued_at, r.review_status, r.created_at,
             u.legal_name, u.public_handle
      FROM title_dept_verification_reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.review_status = 'PENDING'
      ORDER BY r.created_at ASC
      LIMIT $1;
    `,
    limit
  );
}

export async function resolveTitleDeptReview(input: {
  reviewId: string;
  action: "approve" | "reject";
  adminDeviceId: string;
  adminNote?: string;
}) {
  await ensureTitleDeptReviewTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      user_id: string;
      pending_title: string | null;
      pending_department: string | null;
      digital_card_id: string | null;
    }>
  >(
    `
      SELECT user_id, pending_title, pending_department, digital_card_id
      FROM title_dept_verification_reviews
      WHERE id = $1::uuid AND review_status = 'PENDING'
      LIMIT 1;
    `,
    input.reviewId
  );
  const row = rows[0];
  if (!row) throw new Error("REVIEW_NOT_FOUND");

  const nextStatus: TitleDeptReviewStatus = input.action === "approve" ? "APPROVED" : "REJECTED";
  const approvedTitle = input.action === "approve" ? row.pending_title : null;
  const approvedDepartment = input.action === "approve" ? row.pending_department : null;

  await prisma.$executeRawUnsafe(
    `
      UPDATE title_dept_verification_reviews
      SET review_status = $2,
          approved_title = $3,
          approved_department = $4,
          admin_note = $5,
          reviewed_by_admin_device_id = $6::uuid,
          updated_at = NOW()
      WHERE id = $1::uuid;
    `,
    input.reviewId,
    nextStatus,
    approvedTitle,
    approvedDepartment,
    input.adminNote || null,
    input.adminDeviceId
  );

  return {
    userId: row.user_id,
    approvedTitle: approvedTitle || "",
    approvedDepartment: approvedDepartment || "",
    digitalCardId: row.digital_card_id
  };
}
