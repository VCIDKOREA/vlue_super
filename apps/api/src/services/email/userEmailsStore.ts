import { prisma } from "../../db/client.js";

export type UserEmailRow = {
  id: string;
  user_id: string;
  direction: string;
  mail_source: string;
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  received_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
};

let initialized = false;

export async function ensureUserEmailsTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      direction VARCHAR(12) NOT NULL DEFAULT 'inbound',
      mail_source VARCHAR(24) NOT NULL DEFAULT 'VIRTUAL_FORWARD',
      from_address VARCHAR(254) NOT NULL,
      to_address VARCHAR(254) NOT NULL,
      subject VARCHAR(500) NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      body_html TEXT,
      received_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_user_emails_user_created ON user_emails(user_id, created_at DESC);"
  );
  initialized = true;
}

export async function insertUserEmail(input: {
  userId: string;
  direction: "inbound" | "outbound";
  mailSource?: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  receivedAt?: Date;
  sentAt?: Date;
}): Promise<UserEmailRow> {
  await ensureUserEmailsTable();
  const rows = await prisma.$queryRawUnsafe<UserEmailRow[]>(
    `
      INSERT INTO user_emails (
        user_id, direction, mail_source, from_address, to_address,
        subject, body_text, body_html, received_at, sent_at
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `,
    input.userId,
    input.direction,
    input.mailSource || "VIRTUAL_FORWARD",
    input.fromAddress,
    input.toAddress,
    input.subject,
    input.bodyText,
    input.bodyHtml ?? null,
    input.receivedAt ?? (input.direction === "inbound" ? new Date() : null),
    input.sentAt ?? (input.direction === "outbound" ? new Date() : null)
  );
  return rows[0]!;
}

export async function listUserEmails(userId: string, limit = 100): Promise<UserEmailRow[]> {
  await ensureUserEmailsTable();
  return prisma.$queryRawUnsafe<UserEmailRow[]>(
    `
      SELECT * FROM user_emails
      WHERE user_id = $1::uuid
      ORDER BY COALESCE(received_at, sent_at, created_at) DESC
      LIMIT $2
    `,
    userId,
    limit
  );
}

export async function getUserEmailById(userId: string, id: string): Promise<UserEmailRow | null> {
  await ensureUserEmailsTable();
  const rows = await prisma.$queryRawUnsafe<UserEmailRow[]>(
    `SELECT * FROM user_emails WHERE user_id = $1::uuid AND id = $2::uuid LIMIT 1`,
    userId,
    id
  );
  return rows[0] || null;
}
