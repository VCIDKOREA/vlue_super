-- Two-track signup: company verification flag + in-app mailbox (user_emails)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_company_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_verified_at" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "user_emails" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "direction" VARCHAR(12) NOT NULL DEFAULT 'inbound',
  "mail_source" VARCHAR(24) NOT NULL DEFAULT 'VIRTUAL_FORWARD',
  "from_address" VARCHAR(254) NOT NULL,
  "to_address" VARCHAR(254) NOT NULL,
  "subject" VARCHAR(500) NOT NULL DEFAULT '',
  "body_text" TEXT NOT NULL DEFAULT '',
  "body_html" TEXT,
  "received_at" TIMESTAMPTZ,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_emails_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_user_emails_user_created" ON "user_emails"("user_id", "created_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_emails_user_id_fkey'
  ) THEN
    ALTER TABLE "user_emails"
      ADD CONSTRAINT "user_emails_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
