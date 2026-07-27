-- 기업/대표번호 디지털 인증명함 신청
CREATE TABLE IF NOT EXISTS "enterprise_dcc_applications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicant_user_id" UUID NOT NULL,
  "business_registration_no" VARCHAR(20) NOT NULL,
  "company_name_locked" VARCHAR(200) NOT NULL DEFAULT '',
  "nts_status_code" VARCHAR(8),
  "nts_verified_at" TIMESTAMPTZ(6),
  "related_party_user_id" UUID,
  "related_party_verified_at" TIMESTAMPTZ(6),
  "department" VARCHAR(120),
  "contact_name" VARCHAR(120),
  "dcc_outbound_phone" VARCHAR(32),
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "admin_note" TEXT,
  "reviewed_at" TIMESTAMPTZ(6),
  "reviewed_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "enterprise_dcc_applications_applicant_idx"
  ON "enterprise_dcc_applications"("applicant_user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "enterprise_dcc_applications_bno_idx"
  ON "enterprise_dcc_applications"("business_registration_no");

CREATE INDEX IF NOT EXISTS "enterprise_dcc_applications_status_idx"
  ON "enterprise_dcc_applications"("status", "created_at" DESC);
