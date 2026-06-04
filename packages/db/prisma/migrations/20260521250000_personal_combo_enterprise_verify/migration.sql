-- 복수 계정 콤보 — 개인 계정 회사 인증 플래그 (기업 계정 FK 없음)
ALTER TABLE "users"
  ADD COLUMN "is_enterprise_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enterprise_verified_at" TIMESTAMPTZ(6),
  ADD COLUMN "enterprise_verified_email" VARCHAR(254),
  ADD COLUMN "enterprise_verify_next_check_at" TIMESTAMPTZ(6);

CREATE INDEX "users_is_enterprise_verified_idx" ON "users" ("is_enterprise_verified");

ALTER TABLE "user_subscriptions"
  ADD COLUMN "is_personal_combo" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "personal_enterprise_mail_otps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "otp_hash" VARCHAR(128) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "verified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "personal_enterprise_mail_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "personal_enterprise_mail_otps_user_id_created_at_idx"
  ON "personal_enterprise_mail_otps" ("user_id", "created_at" DESC);

CREATE INDEX "personal_enterprise_mail_otps_email_created_at_idx"
  ON "personal_enterprise_mail_otps" ("email", "created_at" DESC);

ALTER TABLE "personal_enterprise_mail_otps"
  ADD CONSTRAINT "personal_enterprise_mail_otps_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
