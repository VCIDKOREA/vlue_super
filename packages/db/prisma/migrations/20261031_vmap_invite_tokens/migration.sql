-- V-Map 카카오 초대 토큰 (24h)
CREATE TABLE IF NOT EXISTS "vmap_invite_tokens" (
    "id" VARCHAR(64) NOT NULL,
    "room_id" UUID NOT NULL,
    "inviter_user_id" UUID NOT NULL,
    "inviter_name" VARCHAR(80) NOT NULL DEFAULT '회원',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vmap_invite_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vmap_invite_tokens_room_id_idx" ON "vmap_invite_tokens"("room_id");
CREATE INDEX IF NOT EXISTS "vmap_invite_tokens_expires_at_idx" ON "vmap_invite_tokens"("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vmap_invite_tokens_room_id_fkey'
  ) THEN
    ALTER TABLE "vmap_invite_tokens"
      ADD CONSTRAINT "vmap_invite_tokens_room_id_fkey"
      FOREIGN KEY ("room_id") REFERENCES "vmap_rooms"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vmap_invite_tokens_inviter_user_id_fkey'
  ) THEN
    ALTER TABLE "vmap_invite_tokens"
      ADD CONSTRAINT "vmap_invite_tokens_inviter_user_id_fkey"
      FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
