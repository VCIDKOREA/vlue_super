import { prisma } from "../../db/client.js";

let initialized = false;

export type OfficeEmailInboxRow = {
  id: string;
  user_id: string;
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string | null;
  attachment_asset_ids: string[];
  attachment_names: string[];
  created_at: Date;
};

async function ensureTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS office_email_inbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      from_address VARCHAR(320) NOT NULL,
      to_address VARCHAR(320) NOT NULL,
      subject VARCHAR(500) NOT NULL DEFAULT '',
      body_text TEXT,
      attachment_asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      attachment_names JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_office_email_inbox_user ON office_email_inbox(user_id, created_at DESC);"
  );
  initialized = true;
}

export async function insertOfficeEmailInbox(input: {
  userId: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText?: string;
  attachmentAssetIds: string[];
  attachmentNames: string[];
}) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; created_at: Date }>
  >(
    `
      INSERT INTO office_email_inbox (
        user_id, from_address, to_address, subject, body_text,
        attachment_asset_ids, attachment_names
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
      RETURNING id, created_at;
    `,
    input.userId,
    input.fromAddress.slice(0, 320),
    input.toAddress.slice(0, 320),
    input.subject.slice(0, 500),
    input.bodyText || null,
    JSON.stringify(input.attachmentAssetIds),
    JSON.stringify(input.attachmentNames)
  );
  return rows[0] || null;
}

export async function listOfficeEmailInbox(userId: string, limit = 80) {
  await ensureTable();
  return prisma.$queryRawUnsafe<OfficeEmailInboxRow[]>(
    `
      SELECT id, user_id, from_address, to_address, subject, body_text,
             attachment_asset_ids, attachment_names, created_at
      FROM office_email_inbox
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2;
    `,
    userId,
    limit
  );
}

export function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((x) => String(x));
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
    } catch {
      return [];
    }
  }
  return [];
}
