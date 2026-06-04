-- VLUER referral lock · code change · penalty · org dashboard

CREATE TYPE "VluerCodeChangeStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE "referral_attributions" (
    "user_id" UUID NOT NULL,
    "sponsor_vluer_user_id" UUID,
    "referral_code_used" VARCHAR(24),
    "attributed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code_change_locked_until" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "referral_attributions_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "referral_attributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "referral_attributions_sponsor_vluer_user_id_fkey" FOREIGN KEY ("sponsor_vluer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "referral_attributions_sponsor_vluer_user_id_idx" ON "referral_attributions"("sponsor_vluer_user_id");

CREATE TABLE "vluer_code_change_requests" (
    "id" UUID NOT NULL,
    "member_user_id" UUID NOT NULL,
    "current_sponsor_user_id" UUID,
    "requested_referral_code" VARCHAR(24) NOT NULL,
    "status" "VluerCodeChangeStatus" NOT NULL DEFAULT 'pending',
    "admin_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "vluer_code_change_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vluer_code_change_requests_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "vluer_code_change_requests_member_user_id_status_idx" ON "vluer_code_change_requests"("member_user_id", "status");
CREATE INDEX "vluer_code_change_requests_current_sponsor_user_id_status_idx" ON "vluer_code_change_requests"("current_sponsor_user_id", "status");

CREATE TABLE "vluer_referral_penalties" (
    "id" UUID NOT NULL,
    "member_user_id" UUID NOT NULL,
    "sponsor_user_id" UUID,
    "code_change_request_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "monthly_full_price_krw" INTEGER NOT NULL DEFAULT 28300,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vluer_referral_penalties_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vluer_referral_penalties_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "vluer_referral_penalties_member_user_id_is_active_idx" ON "vluer_referral_penalties"("member_user_id", "is_active");

ALTER TABLE "user_vluer_profiles" ADD COLUMN IF NOT EXISTS "cumulative_b2b_enterprises" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "b2b_enterprise_accounts" ADD COLUMN IF NOT EXISTS "acquired_by_vluer_user_id" UUID;
ALTER TABLE "b2b_enterprise_accounts" ADD CONSTRAINT "b2b_enterprise_accounts_acquired_by_vluer_user_id_fkey"
    FOREIGN KEY ("acquired_by_vluer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "b2b_enterprise_accounts_acquired_by_vluer_user_id_idx" ON "b2b_enterprise_accounts"("acquired_by_vluer_user_id");
