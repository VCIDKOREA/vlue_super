-- VLUE native signup + social login link (no social signup)
CREATE TYPE "SocialLoginProvider" AS ENUM ('kakao', 'naver');

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_method" VARCHAR(32) NOT NULL DEFAULT 'vlue_native';

CREATE TABLE "user_social_login_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "provider" "SocialLoginProvider" NOT NULL,
  "provider_user_id" VARCHAR(80) NOT NULL,
  "provider_email" VARCHAR(254),
  "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "last_login_at" TIMESTAMPTZ(6)
);

CREATE UNIQUE INDEX "user_social_login_links_provider_provider_user_id_key"
  ON "user_social_login_links" ("provider", "provider_user_id");
CREATE UNIQUE INDEX "user_social_login_links_user_id_provider_key"
  ON "user_social_login_links" ("user_id", "provider");
CREATE INDEX "user_social_login_links_user_id_idx" ON "user_social_login_links" ("user_id");

ALTER TABLE "user_social_login_links"
  ADD CONSTRAINT "user_social_login_links_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
