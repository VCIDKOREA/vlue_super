-- 대표·유선 계정 담당자 프리셋 (User 1 : N). DigitalCard 는 활성 담당자 스냅샷.
CREATE TABLE IF NOT EXISTS "user_dcc_agent_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "label" VARCHAR(80) NOT NULL DEFAULT '',
  "display_name" VARCHAR(120) NOT NULL,
  "title" VARCHAR(120) NOT NULL DEFAULT '',
  "department" VARCHAR(120) NOT NULL DEFAULT '',
  "photo_url" TEXT,
  "photo_focus" VARCHAR(16) NOT NULL DEFAULT 'center',
  "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_dcc_agent_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_dcc_agent_profiles_user_id_is_active_idx"
  ON "user_dcc_agent_profiles" ("user_id", "is_active");

CREATE INDEX IF NOT EXISTS "user_dcc_agent_profiles_user_id_sort_order_idx"
  ON "user_dcc_agent_profiles" ("user_id", "sort_order");

-- 계정당 활성 담당자 1명
CREATE UNIQUE INDEX IF NOT EXISTS "user_dcc_agent_profiles_one_active_idx"
  ON "user_dcc_agent_profiles" ("user_id")
  WHERE "is_active" = TRUE;
