import { prisma } from "../../db/client.js";

let initialized = false;

export type MarketingPopupRow = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  link_type: string;
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
  priority: number;
  created_by_admin_device_id: string | null;
  created_at: Date;
  updated_at: Date;
};

async function ensureTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS marketing_popups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      link_url TEXT,
      link_type VARCHAR(20) NOT NULL DEFAULT 'external',
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      priority INT NOT NULL DEFAULT 0,
      created_by_admin_device_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_marketing_popups_active ON marketing_popups(is_active, starts_at, ends_at, priority DESC);"
  );
  initialized = true;
}

function mapPopupRow(row: MarketingPopupRow) {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    linkUrl: row.link_url || "",
    linkType: row.link_type || "external",
    startsAt: row.starts_at instanceof Date ? row.starts_at.toISOString() : row.starts_at,
    endsAt: row.ends_at instanceof Date ? row.ends_at.toISOString() : row.ends_at,
    isActive: row.is_active,
    priority: row.priority,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function createMarketingPopup(input: {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: "internal" | "external";
  startsAt: string;
  endsAt: string;
  adminDeviceId?: string;
}) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<MarketingPopupRow[]>(
    `
      INSERT INTO marketing_popups (
        title, image_url, link_url, link_type, starts_at, ends_at,
        is_active, priority, created_by_admin_device_id, updated_at
      )
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, true, 0, $7::uuid, NOW())
      RETURNING *;
    `,
    input.title.slice(0, 200),
    input.imageUrl,
    input.linkUrl?.slice(0, 2000) || null,
    input.linkType === "internal" ? "internal" : "external",
    input.startsAt,
    input.endsAt,
    input.adminDeviceId || null
  );
  return mapPopupRow(rows[0]);
}

export async function getActiveMarketingPopup(now = new Date()) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<MarketingPopupRow[]>(
    `
      SELECT *
      FROM marketing_popups
      WHERE is_active = true
        AND starts_at <= $1::timestamptz
        AND ends_at >= $1::timestamptz
      ORDER BY priority DESC, created_at DESC
      LIMIT 1;
    `,
    now.toISOString()
  );
  return rows[0] ? mapPopupRow(rows[0]) : null;
}

export async function listMarketingPopups(limit = 20) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<MarketingPopupRow[]>(
    `
      SELECT *
      FROM marketing_popups
      ORDER BY created_at DESC
      LIMIT $1;
    `,
    limit
  );
  return rows.map(mapPopupRow);
}

export async function updateMarketingPopup(
  id: string,
  input: {
    title?: string;
    imageUrl?: string;
    linkUrl?: string;
    linkType?: "internal" | "external";
    startsAt?: string;
    endsAt?: string;
    isActive?: boolean;
    priority?: number;
  }
) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<MarketingPopupRow[]>(
    `
      UPDATE marketing_popups
      SET
        title = COALESCE($2, title),
        image_url = COALESCE($3, image_url),
        link_url = COALESCE($4, link_url),
        link_type = COALESCE($5, link_type),
        starts_at = COALESCE($6::timestamptz, starts_at),
        ends_at = COALESCE($7::timestamptz, ends_at),
        is_active = COALESCE($8, is_active),
        priority = COALESCE($9, priority),
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *;
    `,
    id,
    input.title?.slice(0, 200) ?? null,
    input.imageUrl ?? null,
    input.linkUrl !== undefined ? input.linkUrl?.slice(0, 2000) || null : null,
    input.linkType ? (input.linkType === "internal" ? "internal" : "external") : null,
    input.startsAt ?? null,
    input.endsAt ?? null,
    input.isActive ?? null,
    input.priority ?? null
  );
  if (!rows[0]) return null;
  return mapPopupRow(rows[0]);
}

export async function deleteMarketingPopup(id: string) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `DELETE FROM marketing_popups WHERE id = $1::uuid RETURNING id;`,
    id
  );
  return rows.length > 0;
}
