import { prisma } from "../../db/client.js";

export type MailTalkMessageDirection = "SENT" | "RECEIVED";

export type MailTalkRoomRow = {
  id: string;
  user_id: string;
  counterparty_email: string;
  created_at: Date;
  updated_at: Date;
};

export type MailTalkMessageRow = {
  id: string;
  room_id: string;
  direction: MailTalkMessageDirection;
  body_text: string;
  raw_body_text: string | null;
  body_html: string | null;
  subject: string;
  attachment_urls: string[];
  ses_message_id: string | null;
  created_at: Date;
};

export type MailTalkTemplateRow = {
  user_id: string;
  greeting_text: string | null;
  closing_text: string | null;
  signature_html: string | null;
  logo_url: string | null;
  display_name: string | null;
  job_title: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  updated_at: Date;
};

let initialized = false;

export async function ensureMailTalkTables() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MailTalkMessageDirection" AS ENUM ('SENT', 'RECEIVED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS mail_talk_rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      counterparty_email VARCHAR(254) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, counterparty_email)
    );
  `);
  await prisma.$executeRawUnsafe(`
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
  `);
  await prisma.$executeRawUnsafe(`
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
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS mail_talk_ses_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(40) NOT NULL,
      recipient_email VARCHAR(254) NOT NULL,
      ses_message_id VARCHAR(120),
      payload_json JSONB NOT NULL,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_mail_talk_rooms_user_updated ON mail_talk_rooms(user_id, updated_at DESC);"
  );
  await prisma.$executeRawUnsafe(`
    ALTER TABLE mail_talk_messages ADD COLUMN IF NOT EXISTS raw_body_text TEXT;
    ALTER TABLE mail_talk_messages ADD COLUMN IF NOT EXISTS body_html TEXT;
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_mail_talk_messages_room_created ON mail_talk_messages(room_id, created_at ASC);"
  );
  initialized = true;
}

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export async function getOrCreateMailTalkRoom(
  userId: string,
  counterpartyEmail: string
): Promise<MailTalkRoomRow> {
  await ensureMailTalkTables();
  const email = normalizeEmail(counterpartyEmail);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("INVALID_COUNTERPARTY_EMAIL");
  }

  const existing = await prisma.$queryRawUnsafe<MailTalkRoomRow[]>(
    `SELECT * FROM mail_talk_rooms WHERE user_id = $1::uuid AND counterparty_email = $2 LIMIT 1`,
    userId,
    email
  );
  if (existing[0]) return existing[0];

  const rows = await prisma.$queryRawUnsafe<MailTalkRoomRow[]>(
    `
      INSERT INTO mail_talk_rooms (user_id, counterparty_email)
      VALUES ($1::uuid, $2)
      RETURNING *;
    `,
    userId,
    email
  );
  return rows[0]!;
}

export async function listMailTalkRooms(userId: string, limit = 50): Promise<MailTalkRoomRow[]> {
  await ensureMailTalkTables();
  return prisma.$queryRawUnsafe<MailTalkRoomRow[]>(
    `
      SELECT * FROM mail_talk_rooms
      WHERE user_id = $1::uuid
      ORDER BY updated_at DESC
      LIMIT $2
    `,
    userId,
    limit
  );
}

export async function getMailTalkRoomById(
  userId: string,
  roomId: string
): Promise<MailTalkRoomRow | null> {
  await ensureMailTalkTables();
  const rows = await prisma.$queryRawUnsafe<MailTalkRoomRow[]>(
    `SELECT * FROM mail_talk_rooms WHERE user_id = $1::uuid AND id = $2::uuid LIMIT 1`,
    userId,
    roomId
  );
  return rows[0] || null;
}

export async function insertMailTalkMessage(input: {
  roomId: string;
  direction: MailTalkMessageDirection;
  bodyText: string;
  rawBodyText?: string | null;
  bodyHtml?: string | null;
  subject?: string;
  attachmentUrls?: string[];
  sesMessageId?: string | null;
  createdAt?: Date;
}): Promise<MailTalkMessageRow> {
  await ensureMailTalkTables();
  const rows = await prisma.$queryRawUnsafe<MailTalkMessageRow[]>(
    `
      INSERT INTO mail_talk_messages (
        room_id, direction, body_text, raw_body_text, body_html, subject, attachment_urls, ses_message_id, created_at
      )
      VALUES ($1::uuid, $2::"MailTalkMessageDirection", $3, $4, $5, $6, $7::text[], $8, COALESCE($9, NOW()))
      RETURNING *;
    `,
    input.roomId,
    input.direction,
    input.bodyText,
    input.rawBodyText ?? null,
    input.bodyHtml ?? null,
    input.subject || "",
    input.attachmentUrls || [],
    input.sesMessageId ?? null,
    input.createdAt ?? null
  );

  await prisma.$executeRawUnsafe(
    `UPDATE mail_talk_rooms SET updated_at = NOW() WHERE id = $1::uuid`,
    input.roomId
  );

  return rows[0]!;
}

export async function listMailTalkMessages(
  roomId: string,
  limit = 100
): Promise<MailTalkMessageRow[]> {
  await ensureMailTalkTables();
  return prisma.$queryRawUnsafe<MailTalkMessageRow[]>(
    `
      SELECT * FROM mail_talk_messages
      WHERE room_id = $1::uuid
      ORDER BY created_at ASC
      LIMIT $2
    `,
    roomId,
    limit
  );
}

export async function getMailTalkTemplate(userId: string): Promise<MailTalkTemplateRow | null> {
  await ensureMailTalkTables();
  const rows = await prisma.$queryRawUnsafe<MailTalkTemplateRow[]>(
    `SELECT * FROM mail_talk_email_templates WHERE user_id = $1::uuid LIMIT 1`,
    userId
  );
  return rows[0] || null;
}

export async function upsertMailTalkTemplate(
  userId: string,
  input: Partial<Omit<MailTalkTemplateRow, "user_id" | "updated_at">>
): Promise<MailTalkTemplateRow> {
  await ensureMailTalkTables();
  const rows = await prisma.$queryRawUnsafe<MailTalkTemplateRow[]>(
    `
      INSERT INTO mail_talk_email_templates (
        user_id, greeting_text, closing_text, signature_html, logo_url,
        display_name, job_title, company_name, phone, email, website
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        greeting_text = COALESCE(EXCLUDED.greeting_text, mail_talk_email_templates.greeting_text),
        closing_text = COALESCE(EXCLUDED.closing_text, mail_talk_email_templates.closing_text),
        signature_html = COALESCE(EXCLUDED.signature_html, mail_talk_email_templates.signature_html),
        logo_url = COALESCE(EXCLUDED.logo_url, mail_talk_email_templates.logo_url),
        display_name = COALESCE(EXCLUDED.display_name, mail_talk_email_templates.display_name),
        job_title = COALESCE(EXCLUDED.job_title, mail_talk_email_templates.job_title),
        company_name = COALESCE(EXCLUDED.company_name, mail_talk_email_templates.company_name),
        phone = COALESCE(EXCLUDED.phone, mail_talk_email_templates.phone),
        email = COALESCE(EXCLUDED.email, mail_talk_email_templates.email),
        website = COALESCE(EXCLUDED.website, mail_talk_email_templates.website),
        updated_at = NOW()
      RETURNING *;
    `,
    userId,
    input.greeting_text ?? null,
    input.closing_text ?? null,
    input.signature_html ?? null,
    input.logo_url ?? null,
    input.display_name ?? null,
    input.job_title ?? null,
    input.company_name ?? null,
    input.phone ?? null,
    input.email ?? null,
    input.website ?? null
  );
  return rows[0]!;
}

export async function insertMailTalkSesEvent(input: {
  eventType: string;
  recipientEmail: string;
  sesMessageId?: string | null;
  payloadJson: unknown;
}): Promise<{ id: string }> {
  await ensureMailTalkTables();
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `
      INSERT INTO mail_talk_ses_events (event_type, recipient_email, ses_message_id, payload_json, processed_at)
      VALUES ($1, $2, $3, $4::jsonb, NOW())
      RETURNING id;
    `,
    input.eventType,
    normalizeEmail(input.recipientEmail),
    input.sesMessageId ?? null,
    JSON.stringify(input.payloadJson ?? {})
  );
  return rows[0]!;
}
