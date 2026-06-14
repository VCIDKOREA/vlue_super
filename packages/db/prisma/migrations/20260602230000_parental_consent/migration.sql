-- 만 14세 미만 법정대리인(부모) 동의 — 가족보호 자녀 가입

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "requires_parental_consent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "parental_consent_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "parental_guardian_user_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_parental_guardian_user_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_parental_guardian_user_id_fkey"
      FOREIGN KEY ("parental_guardian_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_requires_parental_consent_idx"
  ON "users" ("requires_parental_consent", "parental_consent_at");
