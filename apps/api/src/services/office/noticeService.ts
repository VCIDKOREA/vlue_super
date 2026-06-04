import { prisma } from "../../db/client.js";
import { ssePublishAllConnected } from "../../realtime/sseHub.js";

let initialized = false;

export type NoticeRow = {
  id: string;
  title: string;
  highlight_text: string | null;
  body_text: string;
  published_at: Date;
  created_by_admin_device_id: string | null;
  created_at: Date;
};

async function ensureTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS notices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(300) NOT NULL,
      highlight_text VARCHAR(500),
      body_text TEXT NOT NULL,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by_admin_device_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_notices_published ON notices(published_at DESC);"
  );
  initialized = true;
}

function mapNoticeRow(row: NoticeRow) {
  return {
    id: row.id,
    title: row.title,
    highlightText: row.highlight_text || "",
    bodyText: row.body_text,
    publishedAt: row.published_at instanceof Date ? row.published_at.toISOString() : row.published_at,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function releaseNotice(input: {
  title: string;
  highlightText?: string;
  bodyText: string;
  adminDeviceId?: string;
}) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<NoticeRow[]>(
    `
      INSERT INTO notices (title, highlight_text, body_text, published_at, created_by_admin_device_id)
      VALUES ($1, $2, $3, NOW(), $4::uuid)
      RETURNING *;
    `,
    input.title.slice(0, 300),
    input.highlightText?.slice(0, 500) || null,
    input.bodyText,
    input.adminDeviceId || null
  );
  const notice = mapNoticeRow(rows[0]);

  const delivered = ssePublishAllConnected({
    type: "vlue-notice-released",
    message: "📢 새로운 시스템 업데이트가 배포되었습니다!",
    notice
  });

  return { notice, deliveredConnections: delivered };
}

export async function getLatestNotice() {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<NoticeRow[]>(
    `
      SELECT *
      FROM notices
      ORDER BY published_at DESC
      LIMIT 1;
    `
  );
  return rows[0] ? mapNoticeRow(rows[0]) : null;
}

export async function listNotices(limit = 20) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<NoticeRow[]>(
    `
      SELECT *
      FROM notices
      ORDER BY published_at DESC
      LIMIT $1;
    `,
    limit
  );
  return rows.map(mapNoticeRow);
}
