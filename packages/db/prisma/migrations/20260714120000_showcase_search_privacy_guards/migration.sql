-- V1 쇼케이스 검색 상호주의·프라이버시·어뷰징 방어
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_active_showcase" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_phone_search_allowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_name_search_allowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_id_search_allowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "search_abuse_strike_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "search_suspended_at" TIMESTAMPTZ(6);

-- 기존 유료·태그 보유자 중 본인인증 완료 계정만 검색권 시드
UPDATE "users" u
SET "has_active_showcase" = true
WHERE u."identity_verified" = true
  AND u."account_status" = 'active'
  AND u."user_status" = 'ACTIVE'
  AND (
    cardinality(u."showcase_tags") > 0
    OR EXISTS (SELECT 1 FROM "digital_cards" d WHERE d."user_id" = u."id")
  );

CREATE TABLE IF NOT EXISTS "security_search_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "alert_type" VARCHAR(48) NOT NULL,
  "severity" VARCHAR(16) NOT NULL DEFAULT 'high',
  "message" VARCHAR(500) NOT NULL,
  "meta_json" JSONB,
  "acknowledged" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_search_alerts_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "security_search_alerts"
    ADD CONSTRAINT "security_search_alerts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "security_search_alerts_created_at_idx"
  ON "security_search_alerts"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "security_search_alerts_user_id_created_at_idx"
  ON "security_search_alerts"("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "security_search_alerts_acknowledged_created_at_idx"
  ON "security_search_alerts"("acknowledged", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "users_has_active_showcase_idx"
  ON "users"("has_active_showcase") WHERE "has_active_showcase" = true;
