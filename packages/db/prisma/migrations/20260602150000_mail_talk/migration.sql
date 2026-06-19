-- Mail Talk Phase 1 — 채팅방형 메일 수발신

CREATE TYPE "MailTalkMessageDirection" AS ENUM ('SENT', 'RECEIVED');

CREATE TABLE "mail_talk_rooms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "counterparty_email" VARCHAR(254) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mail_talk_rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mail_talk_rooms_user_id_counterparty_email_key"
  ON "mail_talk_rooms"("user_id", "counterparty_email");
CREATE INDEX "mail_talk_rooms_user_id_updated_at_idx"
  ON "mail_talk_rooms"("user_id", "updated_at" DESC);

ALTER TABLE "mail_talk_rooms"
  ADD CONSTRAINT "mail_talk_rooms_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mail_talk_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "room_id" UUID NOT NULL,
  "direction" "MailTalkMessageDirection" NOT NULL,
  "body_text" TEXT NOT NULL,
  "raw_body_text" TEXT,
  "body_html" TEXT,
  "subject" VARCHAR(500) NOT NULL DEFAULT '',
  "attachment_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ses_message_id" VARCHAR(120),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mail_talk_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mail_talk_messages_room_id_created_at_idx"
  ON "mail_talk_messages"("room_id", "created_at" ASC);

ALTER TABLE "mail_talk_messages"
  ADD CONSTRAINT "mail_talk_messages_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "mail_talk_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mail_talk_email_templates" (
  "user_id" UUID NOT NULL,
  "greeting_text" TEXT,
  "closing_text" TEXT,
  "signature_html" TEXT,
  "logo_url" VARCHAR(1000),
  "display_name" VARCHAR(120),
  "job_title" VARCHAR(120),
  "company_name" VARCHAR(200),
  "phone" VARCHAR(40),
  "email" VARCHAR(254),
  "website" VARCHAR(500),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mail_talk_email_templates_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "mail_talk_email_templates"
  ADD CONSTRAINT "mail_talk_email_templates_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mail_talk_ses_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" VARCHAR(40) NOT NULL,
  "recipient_email" VARCHAR(254) NOT NULL,
  "ses_message_id" VARCHAR(120),
  "payload_json" JSONB NOT NULL,
  "processed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mail_talk_ses_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mail_talk_ses_events_event_type_created_at_idx"
  ON "mail_talk_ses_events"("event_type", "created_at" DESC);
CREATE INDEX "mail_talk_ses_events_recipient_email_idx"
  ON "mail_talk_ses_events"("recipient_email");
