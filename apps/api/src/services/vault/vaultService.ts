import { prisma } from "../../db/client.js";

export type VaultItemInput = {
  userId: string;
  title: string;
  kind?: string;
  payloadJson?: Record<string, unknown> | null;
};

export type VaultConnectionInput = {
  userId: string;
  name: string;
  kind?: string;
  payloadJson?: Record<string, unknown> | null;
};

let initialized = false;

export async function ensureVaultTables() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS partnership_vault_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      title VARCHAR(200) NOT NULL,
      kind VARCHAR(40) NOT NULL DEFAULT 'product',
      payload_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS partnership_vault_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name VARCHAR(200) NOT NULL,
      kind VARCHAR(40) NOT NULL DEFAULT 'linked_info',
      payload_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_vault_items_user_created ON partnership_vault_items(user_id, created_at DESC);"
  );
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_vault_connections_user_created ON partnership_vault_connections(user_id, created_at DESC);"
  );
  initialized = true;
}

function jsonOrNull(value: unknown): string {
  if (!value) return "null";
  return JSON.stringify(value);
}

export async function addVaultItem(input: VaultItemInput) {
  await ensureVaultTables();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; kind: string; payload_json: unknown; created_at: Date }>
  >(
    `
      INSERT INTO partnership_vault_items (user_id, title, kind, payload_json)
      VALUES ($1::uuid, $2, $3, $4::jsonb)
      RETURNING id, title, kind, payload_json, created_at;
    `,
    input.userId,
    input.title.trim(),
    (input.kind || "product").trim(),
    jsonOrNull(input.payloadJson)
  );
  return rows[0] || null;
}

export async function listVaultItems(userId: string) {
  await ensureVaultTables();
  return prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; kind: string; payload_json: unknown; created_at: Date }>
  >(
    `
      SELECT id, title, kind, payload_json, created_at
      FROM partnership_vault_items
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 300;
    `,
    userId
  );
}

export async function addVaultConnection(input: VaultConnectionInput) {
  await ensureVaultTables();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; name: string; kind: string; payload_json: unknown; created_at: Date }>
  >(
    `
      INSERT INTO partnership_vault_connections (user_id, name, kind, payload_json)
      VALUES ($1::uuid, $2, $3, $4::jsonb)
      RETURNING id, name, kind, payload_json, created_at;
    `,
    input.userId,
    input.name.trim(),
    (input.kind || "linked_info").trim(),
    jsonOrNull(input.payloadJson)
  );
  return rows[0] || null;
}

export async function listVaultConnections(userId: string) {
  await ensureVaultTables();
  return prisma.$queryRawUnsafe<
    Array<{ id: string; name: string; kind: string; payload_json: unknown; created_at: Date }>
  >(
    `
      SELECT id, name, kind, payload_json, created_at
      FROM partnership_vault_connections
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 300;
    `,
    userId
  );
}

