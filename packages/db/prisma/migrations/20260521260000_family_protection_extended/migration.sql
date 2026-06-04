-- 가족보호 확장: 노부모 통화·원격앱·정부기관 / 자녀 계좌·동의

ALTER TYPE "FamilyAlertKind" ADD VALUE IF NOT EXISTS 'elder_long_call_unknown';
ALTER TYPE "FamilyAlertKind" ADD VALUE IF NOT EXISTS 'elder_remote_control_app';
ALTER TYPE "FamilyAlertKind" ADD VALUE IF NOT EXISTS 'elder_government_call';
ALTER TYPE "FamilyAlertKind" ADD VALUE IF NOT EXISTS 'child_bank_transaction';
ALTER TYPE "FamilyAlertKind" ADD VALUE IF NOT EXISTS 'child_bank_consent';

ALTER TABLE "family_protection_settings"
  ADD COLUMN IF NOT EXISTS "alert_elder_long_call_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "alert_elder_long_call_minutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "alert_elder_remote_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "alert_elder_gov_call_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "alert_child_bank_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "alert_child_bank_all_tx" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "alert_child_bank_threshold_krw" INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS "alert_child_unknown_payee_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "FamilyBankConsentStatus" AS ENUM ('pending', 'accepted', 'rejected', 'revoked');

CREATE TABLE IF NOT EXISTS "family_bank_consents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "link_id" UUID NOT NULL,
  "guardian_user_id" UUID NOT NULL,
  "ward_user_id" UUID NOT NULL,
  "status" "FamilyBankConsentStatus" NOT NULL DEFAULT 'pending',
  "account_label" VARCHAR(80),
  "bank_code" VARCHAR(20),
  "account_masked" VARCHAR(40),
  "scopes_json" JSONB,
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMPTZ(6),
  CONSTRAINT "family_bank_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "family_bank_consents_link_id_key" ON "family_bank_consents"("link_id");
CREATE INDEX IF NOT EXISTS "family_bank_consents_ward_user_id_status_idx" ON "family_bank_consents"("ward_user_id", "status");

ALTER TABLE "family_bank_consents"
  ADD CONSTRAINT "family_bank_consents_link_id_fkey"
  FOREIGN KEY ("link_id") REFERENCES "family_protection_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "family_bank_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ward_user_id" UUID NOT NULL,
  "link_id" UUID,
  "amount_krw" INTEGER NOT NULL,
  "direction" VARCHAR(8) NOT NULL,
  "counterparty_name" VARCHAR(120),
  "counterparty_masked" VARCHAR(40),
  "is_unknown_payee" BOOLEAN NOT NULL DEFAULT false,
  "source" VARCHAR(32) NOT NULL DEFAULT 'manual',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_bank_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "family_bank_transactions_ward_created_idx"
  ON "family_bank_transactions"("ward_user_id", "created_at" DESC);
