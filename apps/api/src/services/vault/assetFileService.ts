import { prisma } from "../../db/client.js";

export type AssetFileInput = {
  ownerUserId: string;
  fileName: string;
  contentType?: string;
  fileSize?: number | null;
  objectKey: string;
  fileUrl: string;
};

let initialized = false;

async function ensureAssetFilesTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS asset_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id UUID NOT NULL,
      folder_id UUID,
      file_name VARCHAR(260) NOT NULL,
      content_type VARCHAR(120) NOT NULL DEFAULT 'image/jpeg',
      file_size INT,
      object_key VARCHAR(500) NOT NULL,
      file_url VARCHAR(1000) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_asset_files_owner_created ON asset_files(owner_user_id, created_at DESC);"
  );
  initialized = true;
}

export async function addAssetFile(input: AssetFileInput) {
  await ensureAssetFilesTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      file_name: string;
      file_url: string;
      object_key: string;
      created_at: Date;
    }>
  >(
    `
      INSERT INTO asset_files (owner_user_id, file_name, content_type, file_size, object_key, file_url)
      VALUES ($1::uuid, $2, $3, $4, $5, $6)
      RETURNING id, file_name, file_url, object_key, created_at;
    `,
    input.ownerUserId,
    input.fileName.trim().slice(0, 260),
    (input.contentType || "image/jpeg").trim().slice(0, 120),
    input.fileSize ?? null,
    input.objectKey.trim().slice(0, 500),
    input.fileUrl.trim().slice(0, 1000)
  );
  return rows[0] || null;
}

export async function listAssetFilesForUser(ownerUserId: string, limit = 200) {
  await ensureAssetFilesTable();
  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      file_name: string;
      file_url: string;
      content_type: string;
      file_size: number | null;
      object_key: string;
      created_at: Date;
    }>
  >(
    `
      SELECT id, file_name, file_url, content_type, file_size, object_key, created_at
      FROM asset_files
      WHERE owner_user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2;
    `,
    ownerUserId,
    limit
  );
}

export async function addAssetFilesFromUrls(
  ownerUserId: string,
  urls: string[],
  prefix = "page-product"
) {
  const created: Array<{ id: string; file_url: string }> = [];
  let i = 0;
  for (const url of urls) {
    const fileUrl = String(url || "").trim();
    if (!fileUrl) continue;
    i += 1;
    const isData = fileUrl.startsWith("data:");
    const contentType = isData
      ? fileUrl.match(/^data:([^;]+);/)?.[1] || "image/jpeg"
      : "image/jpeg";
    const row = await addAssetFile({
      ownerUserId,
      fileName: `${prefix}-${Date.now()}-${i}.jpg`,
      contentType,
      fileSize: isData ? Math.min(fileUrl.length, 2_000_000) : null,
      objectKey: `${prefix}/${ownerUserId}/${Date.now()}-${i}`,
      fileUrl: fileUrl.slice(0, 1000)
    });
    if (row) created.push({ id: row.id, file_url: row.file_url });
  }
  return created;
}

export async function getAssetFileById(ownerUserId: string, assetFileId: string) {
  await ensureAssetFilesTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      file_name: string;
      file_url: string;
      content_type: string;
      object_key: string;
      created_at: Date;
    }>
  >(
    `
      SELECT id, file_name, file_url, content_type, object_key, created_at
      FROM asset_files
      WHERE id = $1::uuid AND owner_user_id = $2::uuid
      LIMIT 1;
    `,
    assetFileId,
    ownerUserId
  );
  return rows[0] || null;
}
