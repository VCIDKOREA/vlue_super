-- 앱이 없는 회선(02·1577 등) 통화를 소유자 계정 통화목록에 적재

CREATE TABLE IF NOT EXISTS "line_call_events" (
  "id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "line_card_id" UUID,
  "line_phone_e164" VARCHAR(24) NOT NULL,
  "peer_user_id" UUID,
  "peer_phone_e164" VARCHAR(24) NOT NULL,
  "peer_display_name" VARCHAR(120) NOT NULL DEFAULT '',
  "peer_is_vlue_member" BOOLEAN NOT NULL DEFAULT false,
  "peer_membership_tier" VARCHAR(24),
  "direction" VARCHAR(8) NOT NULL DEFAULT 'in',
  "duration_sec" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "line_call_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "line_call_events_owner_user_id_created_at_idx"
  ON "line_call_events" ("owner_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "line_call_events_owner_user_id_line_phone_e164_created_at_idx"
  ON "line_call_events" ("owner_user_id", "line_phone_e164", "created_at");

CREATE INDEX IF NOT EXISTS "line_call_events_peer_user_id_created_at_idx"
  ON "line_call_events" ("peer_user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'line_call_events_owner_user_id_fkey'
  ) THEN
    ALTER TABLE "line_call_events"
      ADD CONSTRAINT "line_call_events_owner_user_id_fkey"
      FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'line_call_events_line_card_id_fkey'
  ) THEN
    ALTER TABLE "line_call_events"
      ADD CONSTRAINT "line_call_events_line_card_id_fkey"
      FOREIGN KEY ("line_card_id") REFERENCES "business_cards"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'line_call_events_peer_user_id_fkey'
  ) THEN
    ALTER TABLE "line_call_events"
      ADD CONSTRAINT "line_call_events_peer_user_id_fkey"
      FOREIGN KEY ("peer_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
