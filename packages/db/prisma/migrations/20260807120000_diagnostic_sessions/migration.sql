-- 원격 Diagnostics Framework (Big Push 등 feature별 세션·이벤트)
CREATE TABLE IF NOT EXISTS "diagnostic_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "feature" VARCHAR(40) NOT NULL,
  "session_key" VARCHAR(48) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'RUNNING',
  "started_at" TIMESTAMPTZ(6) NOT NULL,
  "ended_at" TIMESTAMPTZ(6),
  "device_model" VARCHAR(80),
  "android_version" VARCHAR(24),
  "app_version" VARCHAR(32),
  "device_id" VARCHAR(80),
  "user_id" UUID,
  "phone_masked" VARCHAR(24),
  "last_step" INTEGER NOT NULL DEFAULT 0,
  "fail_step" INTEGER,
  "fail_reason" TEXT,
  "overlay_state_json" JSONB,
  "meta_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "diagnostic_sessions_feature_started_at_idx"
  ON "diagnostic_sessions"("feature", "started_at" DESC);

CREATE INDEX IF NOT EXISTS "diagnostic_sessions_user_id_started_at_idx"
  ON "diagnostic_sessions"("user_id", "started_at" DESC);

CREATE INDEX IF NOT EXISTS "diagnostic_sessions_status_started_at_idx"
  ON "diagnostic_sessions"("status", "started_at" DESC);

CREATE INDEX IF NOT EXISTS "diagnostic_sessions_device_id_started_at_idx"
  ON "diagnostic_sessions"("device_id", "started_at" DESC);

CREATE TABLE IF NOT EXISTS "diagnostic_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "seq" INTEGER NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "label" VARCHAR(160) NOT NULL,
  "ok" BOOLEAN,
  "timestamp" TIMESTAMPTZ(6) NOT NULL,
  "elapsed_ms" INTEGER NOT NULL,
  "reason" TEXT,
  "exception_message" TEXT,
  "exception_stack" TEXT,
  "exception_fn" VARCHAR(160),
  "exception_line" INTEGER,
  "payload_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diagnostic_events_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "diagnostic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "diagnostic_events_session_id_seq_code_key"
  ON "diagnostic_events"("session_id", "seq", "code");

CREATE INDEX IF NOT EXISTS "diagnostic_events_session_id_seq_idx"
  ON "diagnostic_events"("session_id", "seq");
