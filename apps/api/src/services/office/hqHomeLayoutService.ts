import { prisma } from "../../db/client.js";

let initialized = false;

const LIVE_ID = "live";

async function ensureTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hq_home_layout (
      id VARCHAR(32) PRIMARY KEY,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by UUID
    );
  `);
  initialized = true;
}

export async function getHomeLayout() {
  try {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe<Array<{ payload: unknown }>>(
      `SELECT payload FROM hq_home_layout WHERE id = $1 LIMIT 1;`,
      LIVE_ID
    );
    const payload = rows[0]?.payload;
    return payload && typeof payload === "object" ? payload : null;
  } catch (e) {
    console.warn("[hq_home_layout] read failed", e);
    return null;
  }
}

export async function saveHomeLayout(payload: unknown, updatedBy?: string) {
  await ensureTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO hq_home_layout (id, payload, updated_at, updated_by)
      VALUES ($1, $2::jsonb, NOW(), $3::uuid)
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;
    `,
    LIVE_ID,
    JSON.stringify(payload || {}),
    updatedBy || null
  );
  return getHomeLayout();
}
