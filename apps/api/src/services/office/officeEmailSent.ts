import { prisma } from "../../db/client.js";

let initialized = false;

async function ensureTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS office_email_sent (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      from_address VARCHAR(320) NOT NULL,
      to_address VARCHAR(320) NOT NULL,
      subject VARCHAR(500) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
      error_message VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_office_email_sent_user ON office_email_sent(user_id, created_at DESC);"
  );
  initialized = true;
}

export async function insertOfficeEmailSent(input: {
  userId: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
}) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; created_at: Date }>>(
    `
      INSERT INTO office_email_sent (user_id, from_address, to_address, subject, status, error_message)
      VALUES ($1::uuid, $2, $3, $4, $5, $6)
      RETURNING id, created_at;
    `,
    input.userId,
    input.fromAddress.slice(0, 320),
    input.toAddress.slice(0, 320),
    input.subject.slice(0, 500),
    input.status,
    input.errorMessage || null
  );
  return rows[0] || null;
}

export async function listOfficeEmailSent(userId: string, limit = 80) {
  await ensureTable();
  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      from_address: string;
      to_address: string;
      subject: string;
      status: string;
      error_message: string | null;
      created_at: Date;
    }>
  >(
    `
      SELECT id, from_address, to_address, subject, status, error_message, created_at
      FROM office_email_sent
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2;
    `,
    userId,
    limit
  );
}

export function mapSentRowsForApi(rows: Awaited<ReturnType<typeof listOfficeEmailSent>>) {
  return rows.map((row) => ({
    id: row.id,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    subject: row.subject,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  }));
}
