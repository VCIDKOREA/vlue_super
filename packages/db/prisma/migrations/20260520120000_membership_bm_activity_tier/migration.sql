-- BM: 활동 티어 기본 3 · 유료 구독 할인/추천인 필드
ALTER TABLE "user_vluer_profiles" ADD COLUMN IF NOT EXISTS "activity_tier" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "list_price_krw" INTEGER;
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "is_discounted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "referral_code_used" VARCHAR(24);
ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "sponsor_vluer_user_id" UUID;
