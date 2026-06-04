import { prisma } from "../../db/client.js";

let initialized = false;

function normalizeLineNumber(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

async function ensureCompanyLinesTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS company_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      line_number VARCHAR(40) NOT NULL,
      company_name VARCHAR(200),
      expires_at TIMESTAMPTZ,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_lines_line_number
    ON company_lines (line_number);
  `);
  initialized = true;
}

export async function assertPaidLineAllowed(senderLineNumber: string) {
  await ensureCompanyLinesTable();
  const normalized = normalizeLineNumber(senderLineNumber);
  if (!normalized) {
    return { allowed: false, reason: "INVALID_LINE" as const };
  }

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; company_name: string | null; expires_at: Date | null; active: boolean }>
  >(
    `
      SELECT id, company_name, expires_at, active
      FROM company_lines
      WHERE regexp_replace(line_number, '[^0-9]', '', 'g') = $1
      LIMIT 1;
    `,
    normalized
  );

  const row = rows[0];
  if (!row || !row.active) {
    const envList = (process.env.COMPANY_LINE_WHITELIST || "")
      .split(",")
      .map((s) => normalizeLineNumber(s))
      .filter(Boolean);
    if (envList.includes(normalized)) {
      return { allowed: true, source: "env" as const, companyName: "ENV_WHITELIST" };
    }
    return { allowed: false, reason: "NOT_WHITELISTED" as const };
  }

  if (row.expires_at && row.expires_at.getTime() < Date.now()) {
    return { allowed: false, reason: "LINE_EXPIRED" as const };
  }

  return {
    allowed: true,
    source: "company_lines" as const,
    companyName: row.company_name || "VLUE Partner"
  };
}

export async function seedDemoCompanyLine(lineNumber: string, companyName: string) {
  await ensureCompanyLinesTable();
  const normalized = normalizeLineNumber(lineNumber);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO company_lines (line_number, company_name, active, expires_at)
      VALUES ($1, $2, true, NOW() + INTERVAL '365 days')
      ON CONFLICT (line_number) DO UPDATE
      SET company_name = EXCLUDED.company_name, active = true, expires_at = EXCLUDED.expires_at;
    `,
    lineNumber,
    companyName
  );
}
