-- 5-Way 프로필 슬롯 + 상대방 표기 방식
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_profile_source" VARCHAR(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name_mode" VARCHAR(16) NOT NULL DEFAULT 'nickname';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vlue_profile_nickname" VARCHAR(64);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vlue_profile_nickname_locked_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vlue_profile_photo_url" TEXT;

ALTER TABLE "user_social_login_links" ADD COLUMN IF NOT EXISTS "provider_nickname" VARCHAR(120);
ALTER TABLE "user_social_login_links" ADD COLUMN IF NOT EXISTS "provider_profile_image_url" TEXT;

-- 기존 소셜 가입자: 가입 제공자를 기본 프로필 소스로
UPDATE "users"
SET "active_profile_source" = "signup_method"
WHERE "active_profile_source" IS NULL
  AND "signup_method" IN ('kakao', 'naver', 'google', 'instagram');
