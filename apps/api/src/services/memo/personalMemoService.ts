import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { ensureFcmPushQueueTable } from "../office/fcmPushQueue.js";
import { scrapeUrlMeta } from "../sourcing/urlMetaScraper.js";

export type MemoType = "text" | "image" | "file" | "link" | "share";

export type MemoRow = {
  id: string;
  user_id: string;
  type: string;
  content: string;
  title: string | null;
  source_app: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  is_pinned: boolean;
  is_bookmarked: boolean;
  is_unread: boolean;
  tags: unknown;
  bg_color: string;
  ai_summary: string | null;
  reminder_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

let schemaReady = false;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidMemoUserId(userId: string) {
  return UUID_RE.test(String(userId || "").trim());
}

export async function ensurePersonalMemosSchema() {
  if (schemaReady) return;
  await ensureFcmPushQueueTable();
  await prisma.$executeRawUnsafe(
    `ALTER TABLE office_fcm_push_queue ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS personal_memos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'text',
      content TEXT NOT NULL DEFAULT '',
      title VARCHAR(200),
      source_app VARCHAR(100),
      source_url VARCHAR(500),
      thumbnail_url VARCHAR(500),
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
      is_unread BOOLEAN NOT NULL DEFAULT FALSE,
      tags JSONB,
      bg_color VARCHAR(20) NOT NULL DEFAULT 'white',
      ai_summary TEXT,
      reminder_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_personal_memos_user ON personal_memos(user_id);"
  );
  schemaReady = true;
}

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function rowToMemo(row: MemoRow) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as MemoType,
    content: row.content,
    title: row.title,
    sourceApp: row.source_app,
    sourceUrl: row.source_url,
    thumbnailUrl: row.thumbnail_url,
    isPinned: row.is_pinned,
    isBookmarked: row.is_bookmarked,
    isUnread: row.is_unread,
    tags: parseTags(row.tags),
    bgColor: row.bg_color || "white",
    aiSummary: row.ai_summary,
    reminderAt: row.reminder_at ? row.reminder_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function youtubeThumb(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
}

export async function fetchLinkPreview(url: string) {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("url is required");
  const ytThumb = youtubeThumb(trimmed);
  if (ytThumb) {
    try {
      const meta = await scrapeUrlMeta(trimmed);
      return {
        url: trimmed,
        title: meta.title || "YouTube",
        description: meta.description || "",
        thumbnailUrl: meta.imageUrl || ytThumb,
        priceKrw: meta.priceKrw || 0
      };
    } catch {
      return { url: trimmed, title: "YouTube", description: "", thumbnailUrl: ytThumb, priceKrw: 0 };
    }
  }
  const meta = await scrapeUrlMeta(trimmed);
  return {
    url: trimmed,
    title: meta.title,
    description: meta.description,
    thumbnailUrl: meta.imageUrl,
    priceKrw: meta.priceKrw || 0
  };
}

export type MemoInput = {
  type?: MemoType;
  content: string;
  title?: string | null;
  sourceApp?: string | null;
  sourceUrl?: string | null;
  thumbnailUrl?: string | null;
  isPinned?: boolean;
  isBookmarked?: boolean;
  isUnread?: boolean;
  tags?: string[];
  bgColor?: string;
  aiSummary?: string | null;
  reminderAt?: string | null;
};

export async function createPersonalMemo(userId: string, input: MemoInput) {
  await ensurePersonalMemosSchema();
  if (!isValidMemoUserId(userId)) throw new Error("INVALID_USER");
  const content = String(input.content || "").trim();
  if (!content) throw new Error("content is required");
  const tagsJson = JSON.stringify(input.tags || []);
  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `
    INSERT INTO personal_memos (
      user_id, type, content, title, source_app, source_url, thumbnail_url,
      is_pinned, is_bookmarked, is_unread, tags, bg_color, ai_summary, reminder_at
    ) VALUES (
      $1::uuid, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11::jsonb, $12, $13, $14::timestamptz
    )
    RETURNING *;
    `,
    userId,
    input.type || "text",
    content,
    input.title || null,
    input.sourceApp || null,
    input.sourceUrl || null,
    input.thumbnailUrl || null,
    Boolean(input.isPinned),
    Boolean(input.isBookmarked),
    Boolean(input.isUnread),
    tagsJson,
    input.bgColor || "white",
    input.aiSummary || null,
    input.reminderAt || null
  );
  const memo = rowToMemo(rows[0]);
  if (input.reminderAt) await scheduleMemoReminder(userId, memo);
  return memo;
}

export async function listPersonalMemos(
  userId: string,
  opts: {
    filter?: string;
    tag?: string;
    sourceApp?: string;
    sort?: string;
  } = {}
) {
  await ensurePersonalMemosSchema();
  if (!isValidMemoUserId(userId)) return [];
  let where = "user_id = $1::uuid";
  const params: unknown[] = [userId];
  let idx = 2;
  const f = String(opts.filter || "all");
  if (f === "pinned") where += " AND is_pinned = TRUE";
  else if (f === "link") where += " AND type IN ('link','share') AND source_url IS NOT NULL";
  else if (f === "image") where += " AND type = 'image'";
  else if (f === "share") where += " AND type = 'share'";
  if (opts.tag) {
    where += ` AND tags::text ILIKE $${idx}`;
    params.push(`%"${opts.tag.replace(/"/g, "")}"%`);
    idx += 1;
  }
  if (opts.sourceApp) {
    where += ` AND source_app ILIKE $${idx}`;
    params.push(`%${opts.sourceApp}%`);
    idx += 1;
  }
  const order =
    opts.sort === "created"
      ? "created_at DESC"
      : "is_pinned DESC, updated_at DESC";
  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `SELECT * FROM personal_memos WHERE ${where} ORDER BY ${order} LIMIT 500;`,
    ...params
  );
  return rows.map(rowToMemo);
}

export async function getPersonalMemo(id: string, userId: string) {
  await ensurePersonalMemosSchema();
  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `SELECT * FROM personal_memos WHERE id = $1::uuid AND user_id = $2::uuid LIMIT 1;`,
    id,
    userId
  );
  if (!rows[0]) return null;
  return rowToMemo(rows[0]);
}

export async function updatePersonalMemo(id: string, userId: string, patch: Partial<MemoInput>) {
  await ensurePersonalMemosSchema();
  const existing = await getPersonalMemo(id, userId);
  if (!existing) throw new Error("NOT_FOUND");
  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `
    UPDATE personal_memos SET
      type = COALESCE($3, type),
      content = COALESCE($4, content),
      title = COALESCE($5, title),
      source_app = COALESCE($6, source_app),
      source_url = COALESCE($7, source_url),
      thumbnail_url = COALESCE($8, thumbnail_url),
      is_pinned = COALESCE($9, is_pinned),
      is_bookmarked = COALESCE($10, is_bookmarked),
      is_unread = COALESCE($11, is_unread),
      tags = COALESCE($12::jsonb, tags),
      bg_color = COALESCE($13, bg_color),
      ai_summary = COALESCE($14, ai_summary),
      reminder_at = COALESCE($15::timestamptz, reminder_at),
      updated_at = NOW()
    WHERE id = $1::uuid AND user_id = $2::uuid
    RETURNING *;
    `,
    id,
    userId,
    patch.type ?? null,
    patch.content != null ? String(patch.content) : null,
    patch.title !== undefined ? patch.title : null,
    patch.sourceApp !== undefined ? patch.sourceApp : null,
    patch.sourceUrl !== undefined ? patch.sourceUrl : null,
    patch.thumbnailUrl !== undefined ? patch.thumbnailUrl : null,
    patch.isPinned != null ? patch.isPinned : null,
    patch.isBookmarked != null ? patch.isBookmarked : null,
    patch.isUnread != null ? patch.isUnread : null,
    patch.tags ? JSON.stringify(patch.tags) : null,
    patch.bgColor ?? null,
    patch.aiSummary !== undefined ? patch.aiSummary : null,
    patch.reminderAt !== undefined ? patch.reminderAt : null
  );
  const memo = rowToMemo(rows[0]);
  if (patch.reminderAt) await scheduleMemoReminder(userId, memo);
  return memo;
}

export async function deletePersonalMemo(id: string, userId: string) {
  await ensurePersonalMemosSchema();
  await prisma.$executeRawUnsafe(
    `DELETE FROM personal_memos WHERE id = $1::uuid AND user_id = $2::uuid;`,
    id,
    userId
  );
}

export async function searchPersonalMemos(
  userId: string,
  q: string,
  opts: { sourceApp?: string; from?: string; to?: string } = {}
) {
  await ensurePersonalMemosSchema();
  if (!isValidMemoUserId(userId)) return [];
  const term = String(q || "").trim();
  let tagOnly = "";
  if (term.startsWith("#") && term.length > 1) tagOnly = term.slice(1);
  let where = "user_id = $1::uuid";
  const params: unknown[] = [userId];
  let idx = 2;
  if (tagOnly) {
    where += ` AND tags::text ILIKE $${idx}`;
    params.push(`%"${tagOnly}"%`);
    idx += 1;
  } else if (term) {
    where += ` AND (title ILIKE $${idx} OR content ILIKE $${idx} OR source_app ILIKE $${idx})`;
    params.push(`%${term}%`);
    idx += 1;
  }
  if (opts.sourceApp) {
    where += ` AND source_app ILIKE $${idx}`;
    params.push(`%${opts.sourceApp}%`);
    idx += 1;
  }
  if (opts.from) {
    where += ` AND created_at >= $${idx}::timestamptz`;
    params.push(opts.from);
    idx += 1;
  }
  if (opts.to) {
    where += ` AND created_at <= $${idx}::timestamptz`;
    params.push(opts.to);
    idx += 1;
  }
  const rows = await prisma.$queryRawUnsafe<MemoRow[]>(
    `SELECT * FROM personal_memos WHERE ${where} ORDER BY is_pinned DESC, updated_at DESC LIMIT 200;`,
    ...params
  );
  return rows.map(rowToMemo);
}

export async function getMemoListMeta(userId: string) {
  await ensurePersonalMemosSchema();
  if (!isValidMemoUserId(userId)) {
    return { count: 0, preview: "", unreadShareCount: 0 };
  }
  const rows = await prisma.$queryRawUnsafe<
    Array<{ cnt: number; preview: string | null; unread: number }>
  >(
    `
    SELECT
      COUNT(*)::int AS cnt,
      (SELECT LEFT(COALESCE(title, content), 80) FROM personal_memos
       WHERE user_id = $1::uuid ORDER BY updated_at DESC LIMIT 1) AS preview,
      COUNT(*) FILTER (WHERE is_unread AND type = 'share')::int AS unread
    FROM personal_memos WHERE user_id = $1::uuid;
    `,
    userId
  );
  const r = rows[0];
  return {
    count: r?.cnt ?? 0,
    preview: r?.preview || "",
    unreadShareCount: r?.unread ?? 0
  };
}

export async function markMemoRead(id: string, userId: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE personal_memos SET is_unread = FALSE, updated_at = updated_at WHERE id = $1::uuid AND user_id = $2::uuid;`,
    id,
    userId
  );
}

export async function receiveShareMemo(
  userId: string,
  body: {
    text?: string;
    url?: string;
    imageUrl?: string;
    sourceApp?: string;
    title?: string;
    tags?: string[];
    save?: boolean;
  }
) {
  const sourceApp = body.sourceApp || "외부 앱";
  let type: MemoType = "share";
  let content = String(body.text || "").trim();
  let title = body.title || null;
  let sourceUrl: string | null = body.url ? String(body.url) : null;
  let thumbnailUrl: string | null = body.imageUrl || null;

  if (sourceUrl && !content) content = sourceUrl;
  if (!content && !thumbnailUrl) throw new Error("empty share payload");

  const urlInText = content.match(/https?:\/\/[^\s]+/);
  if (sourceUrl || urlInText) {
    const url = sourceUrl || urlInText![0];
    sourceUrl = url;
    type = "link";
    try {
      const preview = await fetchLinkPreview(url);
      title = title || preview.title;
      thumbnailUrl = thumbnailUrl || preview.thumbnailUrl;
      if (!content || content === url) {
        content = [preview.title, preview.description, url].filter(Boolean).join("\n");
      }
    } catch {
      /* keep raw */
    }
  } else if (thumbnailUrl) {
    type = "image";
  }

  const draft = {
    type,
    content,
    title,
    sourceApp,
    sourceUrl,
    thumbnailUrl,
    tags: body.tags || [],
    isUnread: true
  };

  if (body.save === false) return { draft, memo: null };
  const memo = await createPersonalMemo(userId, draft);
  return { draft, memo };
}

async function scheduleMemoReminder(
  userId: string,
  memo: ReturnType<typeof rowToMemo>
) {
  if (!memo.reminderAt) return;
  const at = new Date(memo.reminderAt);
  if (at.getTime() <= Date.now()) return;
  const label = (memo.title || memo.content || "메모").slice(0, 40);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO office_fcm_push_queue (user_id, title, body, payload, channel, status, scheduled_at)
      VALUES ($1::uuid, $2, $3, $4::jsonb, 'memo_reminder', 'pending', $5::timestamptz);
    `,
    userId,
    "메모 리마인더",
    `📝 메모 리마인더: ${label}`.slice(0, 500),
    JSON.stringify({ type: "vlue-memo-reminder", memoId: memo.id }),
    at.toISOString()
  );
  ssePublish(userId, {
    type: "vlue-memo-reminder-scheduled",
    memoId: memo.id,
    reminderAt: memo.reminderAt
  });
}

export async function fireMemoReminder(userId: string, memoId: string) {
  const memo = await getPersonalMemo(memoId, userId);
  if (!memo) return;
  const label = (memo.title || memo.content || "메모").slice(0, 60);
  ssePublish(userId, {
    type: "vlue-memo-reminder",
    memoId: memo.id,
    message: `📝 ${label} 리마인더예요`
  });
}

export async function summarizeMemoText(text: string): Promise<string> {
  const lines = String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 3) return lines.join("\n");
  const head = lines.slice(0, 2).join(" ");
  const mid = lines[Math.floor(lines.length / 2)] || "";
  const tail = lines[lines.length - 1] || "";
  return [head.slice(0, 120), mid.slice(0, 120), tail.slice(0, 120)].filter(Boolean).join("\n");
}
