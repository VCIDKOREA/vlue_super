import { prisma } from "../../db/client.js";

export type OnboardingReviewStatus =
  | "AUTO_APPROVED"
  | "MANUAL_REVIEW"
  | "MANUALLY_APPROVED"
  | "REJECTED";

let initialized = false;

export async function ensureOnboardingReviewTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS onboarding_signup_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      business_registration_no VARCHAR(20) NOT NULL,
      representative_name VARCHAR(120) NOT NULL,
      open_date VARCHAR(8) NOT NULL,
      company_name VARCHAR(200),
      phone_e164 VARCHAR(32),
      nts_status_code VARCHAR(10),
      nts_status_label VARCHAR(80),
      nts_matched BOOLEAN NOT NULL DEFAULT false,
      nts_source VARCHAR(20),
      company_line_whitelist BOOLEAN NOT NULL DEFAULT false,
      review_status VARCHAR(30) NOT NULL,
      failure_reason VARCHAR(500),
      admin_note VARCHAR(500),
      reviewed_by_admin_device_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_onboarding_reviews_user ON onboarding_signup_reviews(user_id, created_at DESC);"
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_onboarding_reviews_status ON onboarding_signup_reviews(review_status, created_at DESC);"
  );
  initialized = true;
}

export async function insertOnboardingReview(input: {
  userId: string;
  businessRegistrationNo: string;
  representativeName: string;
  openDate: string;
  companyName?: string;
  phoneE164?: string;
  ntsStatusCode: string;
  ntsStatusLabel: string;
  ntsMatched: boolean;
  ntsSource: string;
  companyLineWhitelist: boolean;
  reviewStatus: OnboardingReviewStatus;
  failureReason?: string;
}) {
  await ensureOnboardingReviewTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO onboarding_signup_reviews (
        user_id, business_registration_no, representative_name, open_date,
        company_name, phone_e164, nts_status_code, nts_status_label, nts_matched,
        nts_source, company_line_whitelist, review_status, failure_reason
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id;
    `,
    input.userId,
    input.businessRegistrationNo,
    input.representativeName,
    input.openDate,
    input.companyName || null,
    input.phoneE164 || null,
    input.ntsStatusCode,
    input.ntsStatusLabel,
    input.ntsMatched,
    input.ntsSource,
    input.companyLineWhitelist,
    input.reviewStatus,
    input.failureReason || null
  );
  return rows[0]?.id || null;
}

export async function listManualReviewQueue(limit = 80) {
  await ensureOnboardingReviewTable();
  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      business_registration_no: string;
      representative_name: string;
      open_date: string;
      company_name: string | null;
      phone_e164: string | null;
      nts_status_code: string | null;
      nts_status_label: string | null;
      failure_reason: string | null;
      review_status: string;
      created_at: Date;
      legal_name: string | null;
      public_handle: string | null;
      account_status: string | null;
    }>
  >(
    `
      SELECT r.id, r.user_id, r.business_registration_no, r.representative_name, r.open_date,
             r.company_name, r.phone_e164, r.nts_status_code, r.nts_status_label,
             r.failure_reason, r.review_status, r.created_at,
             u.legal_name, u.public_handle, u.account_status::text AS account_status
      FROM onboarding_signup_reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.review_status = 'MANUAL_REVIEW'
      ORDER BY r.created_at ASC
      LIMIT $1;
    `,
    limit
  );
}

export async function getOnboardingStats() {
  await ensureOnboardingReviewTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      total: bigint;
      auto_approved: bigint;
      manual_review: bigint;
      manually_approved: bigint;
      rejected: bigint;
    }>
  >(`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE review_status = 'AUTO_APPROVED')::bigint AS auto_approved,
      COUNT(*) FILTER (WHERE review_status = 'MANUAL_REVIEW')::bigint AS manual_review,
      COUNT(*) FILTER (WHERE review_status = 'MANUALLY_APPROVED')::bigint AS manually_approved,
      COUNT(*) FILTER (WHERE review_status = 'REJECTED')::bigint AS rejected
    FROM onboarding_signup_reviews
    WHERE created_at >= NOW() - INTERVAL '30 days';
  `);
  const s = rows[0] || {
    total: 0n,
    auto_approved: 0n,
    manual_review: 0n,
    manually_approved: 0n,
    rejected: 0n
  };
  const total = Number(s.total);
  const autoApproved = Number(s.auto_approved) + Number(s.manually_approved);
  const manualReview = Number(s.manual_review);
  const autoRate = total > 0 ? Math.round((autoApproved / total) * 1000) / 10 : 0;
  return {
    total,
    autoApproved,
    manualReview,
    rejected: Number(s.rejected),
    autoRatePercent: autoRate
  };
}

export async function resolveManualReview(input: {
  reviewId: string;
  action: "approve" | "reject";
  adminDeviceId: string;
  adminNote?: string;
}) {
  await ensureOnboardingReviewTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
    `SELECT user_id FROM onboarding_signup_reviews WHERE id = $1::uuid AND review_status = 'MANUAL_REVIEW' LIMIT 1;`,
    input.reviewId
  );
  const userId = rows[0]?.user_id;
  if (!userId) throw new Error("REVIEW_NOT_FOUND");

  const nextStatus = input.action === "approve" ? "MANUALLY_APPROVED" : "REJECTED";
  await prisma.$executeRawUnsafe(
    `
      UPDATE onboarding_signup_reviews
      SET review_status = $2, admin_note = $3, reviewed_by_admin_device_id = $4::uuid, updated_at = NOW()
      WHERE id = $1::uuid;
    `,
    input.reviewId,
    nextStatus,
    input.adminNote || null,
    input.adminDeviceId
  );

  await prisma.user.update({
    where: { id: userId },
    data:
      input.action === "approve"
        ? { accountStatus: "active", pendingApprovalAt: null }
        : { accountStatus: "suspended" }
  });

  return { userId, reviewStatus: nextStatus };
}
