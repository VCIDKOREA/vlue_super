-- 멀티 DCC 프로필 = DCC·쇼케이스 전체 번들 + 대표 프로필 플래그
ALTER TABLE "user_dcc_agent_profiles"
  ADD COLUMN IF NOT EXISTS "is_representative" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "dcc_snapshot_json" JSONB,
  ADD COLUMN IF NOT EXISTS "showcase_style_json" JSONB,
  ADD COLUMN IF NOT EXISTS "showcase_live_style_json" JSONB;

CREATE INDEX IF NOT EXISTS "user_dcc_agent_profiles_user_id_is_representative_idx"
  ON "user_dcc_agent_profiles" ("user_id", "is_representative");

-- 계정당 대표 프로필 최대 1개
CREATE UNIQUE INDEX IF NOT EXISTS "user_dcc_agent_profiles_one_representative_idx"
  ON "user_dcc_agent_profiles" ("user_id")
  WHERE "is_representative" = TRUE;

-- 기존 활성 프로필을 대표로 승격 (대표 없는 계정만)
UPDATE "user_dcc_agent_profiles" p
SET "is_representative" = TRUE
WHERE p."is_active" = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM "user_dcc_agent_profiles" x
    WHERE x."user_id" = p."user_id" AND x."is_representative" = TRUE
  );
