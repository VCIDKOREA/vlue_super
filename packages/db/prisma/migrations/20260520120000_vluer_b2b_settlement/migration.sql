-- VLUER tier policy · B2B enterprise cart · commission ledger

CREATE TYPE "VluerTierCode" AS ENUM ('general', 'professional', 'master');
CREATE TYPE "VluerPayoutMode" AS ENUM ('reward_only', 'cash_commission');
CREATE TYPE "B2BTelecomCarrier" AS ENUM ('LGUPLUS', 'KT');
CREATE TYPE "B2BBillingCycle" AS ENUM ('monthly', 'annual');
CREATE TYPE "B2BCartLineKind" AS ENUM ('extension', 'mobile');
CREATE TYPE "B2BEnterpriseStatus" AS ENUM ('draft', 'active', 'suspended');
CREATE TYPE "CorporateAttributionStatus" AS ENUM ('pending_doc_verification', 'approved', 'rejected', 'cancelled');
CREATE TYPE "CommissionLedgerKind" AS ENUM ('subscription_monthly', 'subscription_annual', 'commerce');

CREATE TABLE "vluer_tier_policies" (
    "tier_code" "VluerTierCode" NOT NULL,
    "label_ko" VARCHAR(40) NOT NULL,
    "min_referrals" INTEGER NOT NULL,
    "max_referrals" INTEGER,
    "subscription_rate_bp" INTEGER NOT NULL,
    "commerce_rate_bp" INTEGER NOT NULL DEFAULT 0,
    "payout_mode" "VluerPayoutMode" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vluer_tier_policies_pkey" PRIMARY KEY ("tier_code")
);

INSERT INTO "vluer_tier_policies" ("tier_code", "label_ko", "min_referrals", "max_referrals", "subscription_rate_bp", "commerce_rate_bp", "payout_mode") VALUES
('general', '일반 VLUER', 1, 99, 500, 0, 'reward_only'),
('professional', '전문 VLUER', 100, 999, 1000, 1000, 'cash_commission'),
('master', '마스터 VLUER', 1000, NULL, 1500, 1500, 'cash_commission');

CREATE TABLE "user_vluer_profiles" (
    "user_id" UUID NOT NULL,
    "tier_code" "VluerTierCode" NOT NULL DEFAULT 'general',
    "cumulative_b2c_referrals" INTEGER NOT NULL DEFAULT 0,
    "referral_code" VARCHAR(24),
    "can_act_as_vluer" BOOLEAN NOT NULL DEFAULT true,
    "is_eligible_for_vluer_settlement" BOOLEAN NOT NULL DEFAULT true,
    "rewards_frozen" BOOLEAN NOT NULL DEFAULT false,
    "rewards_frozen_at" TIMESTAMPTZ(6),
    "b2b_blocked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "user_vluer_profiles_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_vluer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "user_vluer_profiles_referral_code_key" ON "user_vluer_profiles"("referral_code");

CREATE TABLE "b2b_enterprise_accounts" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "master_display_number" VARCHAR(32) NOT NULL,
    "carrier" "B2BTelecomCarrier" NOT NULL,
    "billing_cycle" "B2BBillingCycle" NOT NULL DEFAULT 'monthly',
    "status" "B2BEnterpriseStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "b2b_enterprise_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "b2b_enterprise_accounts_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "b2b_enterprise_accounts_admin_user_id_idx" ON "b2b_enterprise_accounts"("admin_user_id");

CREATE TABLE "b2b_cart_lines" (
    "id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "line_kind" "B2BCartLineKind" NOT NULL,
    "real_cli_phone_e164" VARCHAR(24) NOT NULL,
    "assignee_name" VARCHAR(120) NOT NULL,
    "assignee_title" VARCHAR(120),
    "linked_user_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "b2b_cart_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "b2b_cart_lines_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "b2b_cart_lines_enterprise_id_idx" ON "b2b_cart_lines"("enterprise_id");
CREATE INDEX "b2b_cart_lines_real_cli_phone_e164_idx" ON "b2b_cart_lines"("real_cli_phone_e164");

CREATE TABLE "corporate_attribution_requests" (
    "id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "member_user_id" UUID NOT NULL,
    "member_phone_e164" VARCHAR(24) NOT NULL,
    "status" "CorporateAttributionStatus" NOT NULL DEFAULT 'pending_doc_verification',
    "document_urls" JSONB,
    "admin_note" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "corporate_attribution_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "corporate_attribution_requests_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "corporate_attribution_requests_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "corporate_attribution_requests_enterprise_id_status_idx" ON "corporate_attribution_requests"("enterprise_id", "status");
CREATE INDEX "corporate_attribution_requests_member_user_id_idx" ON "corporate_attribution_requests"("member_user_id");

CREATE TABLE "commission_ledgers" (
    "id" UUID NOT NULL,
    "vluer_user_id" UUID NOT NULL,
    "payer_user_id" UUID,
    "kind" "CommissionLedgerKind" NOT NULL,
    "tier_code" "VluerTierCode" NOT NULL,
    "payout_mode" "VluerPayoutMode" NOT NULL,
    "gross_payment_krw" INTEGER NOT NULL,
    "pg_fee_krw" INTEGER NOT NULL DEFAULT 0,
    "commission_krw" INTEGER NOT NULL,
    "blocked_reason" VARCHAR(80),
    "referral_code" VARCHAR(24),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commission_ledgers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "commission_ledgers_vluer_user_id_fkey" FOREIGN KEY ("vluer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "commission_ledgers_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "commission_ledgers_vluer_user_id_created_at_idx" ON "commission_ledgers"("vluer_user_id", "created_at");

ALTER TABLE "business_cards" ADD COLUMN "b2b_enterprise_id" UUID;
ALTER TABLE "business_cards" ADD COLUMN "b2b_cart_line_id" UUID;

CREATE UNIQUE INDEX "business_cards_b2b_cart_line_id_key" ON "business_cards"("b2b_cart_line_id");
CREATE INDEX "business_cards_b2b_enterprise_id_idx" ON "business_cards"("b2b_enterprise_id");

ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_b2b_enterprise_id_fkey" FOREIGN KEY ("b2b_enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_b2b_cart_line_id_fkey" FOREIGN KEY ("b2b_cart_line_id") REFERENCES "b2b_cart_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
