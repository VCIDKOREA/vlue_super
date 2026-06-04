ALTER TABLE "family_protection_settings"
  ADD COLUMN IF NOT EXISTS "extra_member_pack_active" BOOLEAN NOT NULL DEFAULT false;
