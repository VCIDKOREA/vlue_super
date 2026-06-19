-- Idempotent Mail Talk schema for production (no _prisma_migrations baseline)

DO $$ BEGIN
  CREATE TYPE "MailTalkMessageDirection" AS ENUM ('SENT', 'RECEIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS mail_talk_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counterparty_email VARCHAR(254) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, counterparty_email)
);

CREATE INDEX IF NOT EXISTS idx_mail_talk_rooms_user_updated
  ON mail_talk_rooms(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS mail_talk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES mail_talk_rooms(id) ON DELETE CASCADE,
  direction "MailTalkMessageDirection" NOT NULL,
  body_text TEXT NOT NULL,
  subject VARCHAR(500) NOT NULL DEFAULT '',
  attachment_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ses_message_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mail_talk_messages ADD COLUMN IF NOT EXISTS raw_body_text TEXT;
ALTER TABLE mail_talk_messages ADD COLUMN IF NOT EXISTS body_html TEXT;

CREATE INDEX IF NOT EXISTS idx_mail_talk_messages_room_created
  ON mail_talk_messages(room_id, created_at ASC);

CREATE TABLE IF NOT EXISTS mail_talk_email_templates (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  greeting_text TEXT,
  closing_text TEXT,
  signature_html TEXT,
  logo_url VARCHAR(1000),
  display_name VARCHAR(120),
  job_title VARCHAR(120),
  company_name VARCHAR(200),
  phone VARCHAR(40),
  email VARCHAR(254),
  website VARCHAR(500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mail_talk_ses_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(40) NOT NULL,
  recipient_email VARCHAR(254) NOT NULL,
  ses_message_id VARCHAR(120),
  payload_json JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mail_talk_ses_events_type_created
  ON mail_talk_ses_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_talk_ses_events_recipient
  ON mail_talk_ses_events(recipient_email);
