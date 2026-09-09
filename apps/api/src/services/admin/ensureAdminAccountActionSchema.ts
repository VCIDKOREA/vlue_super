import { prisma } from "../../db/client.js";

let schemaReady: boolean | null = null;

/** 관리자 정지·탈퇴 사유 컬럼 보장 (migrate 누락 대비) */
export async function ensureAdminAccountActionSchema(): Promise<boolean> {
  if (schemaReady === true) return true;
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_action_reason VARCHAR(500)"
    );
    await prisma.$executeRawUnsafe(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_action_at TIMESTAMPTZ"
    );
    await prisma.$executeRawUnsafe(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_action_by VARCHAR(64)"
    );
    await prisma.$executeRawUnsafe(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_action_type VARCHAR(32)"
    );
    schemaReady = true;
    return true;
  } catch (err) {
    console.warn("[admin-account-action-schema] ensure failed", err);
    schemaReady = false;
    return false;
  }
}
