import { prisma } from "../../db/client.js";

export type MailSource = "VIRTUAL_FORWARD" | "EXTERNAL_IMAP";

export type InappMailCacheRow = {
  id: string;
  user_id: string;
  mail_source: MailSource;
  from_address: string;
  subject: string;
  snippet: string;
  external_message_id: string | null;
  received_at: Date;
  created_at: Date;
};

let initialized = false;

export async function ensureInappMailCachesTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS inapp_mail_caches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mail_source VARCHAR(32) NOT NULL DEFAULT 'VIRTUAL_FORWARD',
      from_address VARCHAR(254) NOT NULL,
      subject VARCHAR(500) NOT NULL DEFAULT '',
      snippet TEXT NOT NULL DEFAULT '',
      external_message_id VARCHAR(255),
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_inapp_mail_user_received ON inapp_mail_caches(user_id, received_at DESC);"
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_inapp_mail_source ON inapp_mail_caches(user_id, mail_source, received_at DESC);"
  );
  initialized = true;
}

function snippetFromBody(text: string, max = 100) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export async function insertInappMailCache(input: {
  userId: string;
  mailSource: MailSource;
  fromAddress: string;
  subject: string;
  bodyText?: string;
  snippet?: string;
  externalMessageId?: string | null;
  receivedAt?: Date;
}): Promise<InappMailCacheRow> {
  await ensureInappMailCachesTable();
  const snippet = input.snippet ?? snippetFromBody(input.bodyText || "");
  const rows = await prisma.$queryRawUnsafe<InappMailCacheRow[]>(
    `
      INSERT INTO inapp_mail_caches (
        user_id, mail_source, from_address, subject, snippet, external_message_id, received_at
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
      RETURNING *;
    `,
    input.userId,
    input.mailSource,
    input.fromAddress.slice(0, 254),
    input.subject.slice(0, 500),
    snippet,
    input.externalMessageId || null,
    input.receivedAt || null
  );
  return rows[0]!;
}

export async function listInappMailCaches(userId: string, limit = 80): Promise<InappMailCacheRow[]> {
  await ensureInappMailCachesTable();
  const cap = Math.min(Math.max(limit, 1), 200);
  return prisma.$queryRawUnsafe<InappMailCacheRow[]>(
    `
      SELECT * FROM inapp_mail_caches
      WHERE user_id = $1::uuid
      ORDER BY received_at DESC
      LIMIT $2
    `,
    userId,
    cap
  );
}

export async function getInappMailCacheById(
  userId: string,
  id: string
): Promise<InappMailCacheRow | null> {
  await ensureInappMailCachesTable();
  const rows = await prisma.$queryRawUnsafe<InappMailCacheRow[]>(
    `SELECT * FROM inapp_mail_caches WHERE user_id = $1::uuid AND id = $2::uuid LIMIT 1`,
    userId,
    id
  );
  return rows[0] || null;
}
