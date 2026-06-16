-- 0단계: 가상 이메일 포워딩 매핑 (user_email_mappings)
CREATE TABLE IF NOT EXISTS "user_email_mappings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "membership_status" VARCHAR(20) NOT NULL DEFAULT 'FREE',
  "virtual_email_prefix" VARCHAR(64) NOT NULL,
  "user_company_slug" VARCHAR(64),
  "full_virtual_email" VARCHAR(254) NOT NULL,
  "target_master_email" VARCHAR(254),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_email_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_email_mappings_user_id_key" ON "user_email_mappings"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_mappings_full_virtual_email_key" ON "user_email_mappings"("full_virtual_email");
CREATE INDEX IF NOT EXISTS "idx_user_email_mappings_full" ON "user_email_mappings"("full_virtual_email");

ALTER TABLE "user_email_mappings"
  ADD CONSTRAINT "user_email_mappings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "email_forwarding_notification_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "from_address" VARCHAR(254) NOT NULL,
  "subject" VARCHAR(500) NOT NULL DEFAULT '',
  "full_virtual_email" VARCHAR(254) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_forwarding_notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_email_fwd_notif_user" ON "email_forwarding_notification_logs"("user_id", "created_at" DESC);

ALTER TABLE "email_forwarding_notification_logs"
  ADD CONSTRAINT "email_forwarding_notification_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
