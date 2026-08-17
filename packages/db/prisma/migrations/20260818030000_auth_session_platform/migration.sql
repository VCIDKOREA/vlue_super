-- 웹 세션 추적(IP·위치) + 앱 단일 활성 기기 정책용 컬럼

ALTER TABLE "auth_refresh_sessions"
  ADD COLUMN IF NOT EXISTS "client_kind" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "device_token" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "geo_label" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "platform" VARCHAR(16);

CREATE INDEX IF NOT EXISTS "auth_refresh_sessions_user_id_platform_revoked_at_idx"
  ON "auth_refresh_sessions" ("user_id", "platform", "revoked_at");

ALTER TABLE "user_devices"
  ADD COLUMN IF NOT EXISTS "geo_label" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "platform" VARCHAR(16);
