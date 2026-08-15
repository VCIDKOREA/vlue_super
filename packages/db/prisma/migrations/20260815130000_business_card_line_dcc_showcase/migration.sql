-- 내선·대표번호마다 DCC·쇼케이스·담당자를 분리
ALTER TABLE "business_cards"
  ADD COLUMN IF NOT EXISTS "dcc_snapshot_json" JSONB,
  ADD COLUMN IF NOT EXISTS "line_showcase_style_json" JSONB,
  ADD COLUMN IF NOT EXISTS "line_showcase_live_style_json" JSONB,
  ADD COLUMN IF NOT EXISTS "line_showcase_live_source_json" JSONB,
  ADD COLUMN IF NOT EXISTS "line_showcase_updated_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "active_dcc_agent_profile_id" UUID;

CREATE INDEX IF NOT EXISTS "business_cards_active_dcc_agent_profile_id_idx"
  ON "business_cards" ("active_dcc_agent_profile_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_cards_active_dcc_agent_profile_id_fkey'
  ) THEN
    ALTER TABLE "business_cards"
      ADD CONSTRAINT "business_cards_active_dcc_agent_profile_id_fkey"
      FOREIGN KEY ("active_dcc_agent_profile_id")
      REFERENCES "user_dcc_agent_profiles"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
