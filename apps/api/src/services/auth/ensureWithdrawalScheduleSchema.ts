import { prisma } from "../../db/client.js";

let schemaReady: boolean | null = null;

export function isMissingWithdrawalColumnError(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || "");
  return (
    msg.includes("withdrawal_scheduled_at") ||
    msg.includes("withdrawal_requested_at") ||
    msg.includes("withdrawal_method") ||
    msg.includes("P2022")
  );
}

/** Railway 등에서 migrate deploy 누락 시에도 탈퇴 API가 동작하도록 컬럼 보장 */
export async function ensureWithdrawalScheduleSchema(): Promise<boolean> {
  if (schemaReady === true) return true;
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_scheduled_at TIMESTAMPTZ"
    );
    await prisma.$executeRawUnsafe(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_requested_at TIMESTAMPTZ"
    );
    await prisma.$executeRawUnsafe(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_method VARCHAR(32)"
    );
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_users_withdrawal_scheduled ON users (withdrawal_scheduled_at)
      WHERE withdrawal_scheduled_at IS NOT NULL
    `);
    schemaReady = true;
    return true;
  } catch (err) {
    console.warn("[withdrawal-schema] ensure failed", err);
    schemaReady = false;
    return false;
  }
}

export function resetWithdrawalScheduleSchemaCache() {
  schemaReady = null;
}
