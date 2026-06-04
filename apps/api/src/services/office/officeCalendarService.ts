import { prisma } from "../../db/client.js";
import { enqueueFcmPush } from "./fcmPushQueue.js";

let initialized = false;

export async function ensureOfficeCalendarTables() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS office_calendars (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id VARCHAR(120),
      author_user_id UUID NOT NULL,
      title VARCHAR(200) NOT NULL,
      body TEXT,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      push_notify BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_office_cal_group_start ON office_calendars(group_id, starts_at);"
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS office_group_members (
      group_id VARCHAR(120) NOT NULL,
      user_id UUID NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'member',
      PRIMARY KEY (group_id, user_id)
    );
  `);
  initialized = true;
}

export async function upsertGroupMembers(groupId: string, memberUserIds: string[], ownerUserId?: string) {
  await ensureOfficeCalendarTables();
  const ids = [...new Set(memberUserIds.filter(Boolean))];
  if (ownerUserId && !ids.includes(ownerUserId)) ids.unshift(ownerUserId);
  for (const userId of ids) {
    const role = userId === ownerUserId ? "owner" : "member";
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO office_group_members (group_id, user_id, role)
        VALUES ($1, $2::uuid, $3)
        ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role;
      `,
      groupId,
      userId,
      role
    );
  }
}

async function listGroupMemberIds(groupId: string): Promise<string[]> {
  await ensureOfficeCalendarTables();
  const rows = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
    `SELECT user_id FROM office_group_members WHERE group_id = $1;`,
    groupId
  );
  return rows.map((r) => r.user_id);
}

export async function createOfficeCalendarEvent(input: {
  authorUserId: string;
  groupId?: string | null;
  title: string;
  body?: string;
  startsAt: string;
  endsAt: string;
  pushNotify?: boolean;
  notifyUserIds?: string[];
}) {
  await ensureOfficeCalendarTables();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      group_id: string | null;
      author_user_id: string;
      title: string;
      body: string | null;
      starts_at: Date;
      ends_at: Date;
      push_notify: boolean;
      created_at: Date;
    }>
  >(
    `
      INSERT INTO office_calendars (
        group_id, author_user_id, title, body, starts_at, ends_at, push_notify
      )
      VALUES ($1, $2::uuid, $3, $4, $5::timestamptz, $6::timestamptz, $7)
      RETURNING *;
    `,
    input.groupId || null,
    input.authorUserId,
    input.title.slice(0, 200),
    input.body || null,
    input.startsAt,
    input.endsAt,
    input.pushNotify !== false
  );
  const event = rows[0];
  if (!event) throw new Error("CALENDAR_INSERT_FAILED");

  if (input.pushNotify !== false) {
    let targets =
      input.notifyUserIds?.filter((id) => id && id !== input.authorUserId) || [];
    if (!targets.length && input.groupId) {
      targets = (await listGroupMemberIds(input.groupId)).filter((id) => id !== input.authorUserId);
    }
    const when = new Date(event.starts_at).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    for (const userId of targets) {
      await enqueueFcmPush({
        userId,
        title: `📅 ${event.title}`,
        body: `${when} · 그룹 일정이 등록되었습니다.`,
        channel: "office_calendar",
        payload: { type: "office-calendar-event", eventId: event.id, groupId: event.group_id }
      });
    }
  }

  return mapEventRow(event);
}

export async function listOfficeCalendarEvents(query: {
  groupId?: string;
  userId?: string;
  from?: string;
  to?: string;
}) {
  await ensureOfficeCalendarTables();
  const clauses: string[] = [];
  const params: unknown[] = [];
  let n = 1;

  if (query.groupId) {
    clauses.push(`group_id = $${n++}`);
    params.push(query.groupId);
  }
  if (query.userId) {
    clauses.push(
      `(author_user_id = $${n}::uuid OR group_id IN (SELECT group_id FROM office_group_members WHERE user_id = $${n}::uuid))`
    );
    params.push(query.userId);
    n += 1;
  }
  if (query.from) {
    clauses.push(`ends_at >= $${n++}::timestamptz`);
    params.push(query.from);
  }
  if (query.to) {
    clauses.push(`starts_at <= $${n++}::timestamptz`);
    params.push(query.to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      group_id: string | null;
      author_user_id: string;
      title: string;
      body: string | null;
      starts_at: Date;
      ends_at: Date;
      push_notify: boolean;
      created_at: Date;
    }>
  >(
    `SELECT * FROM office_calendars ${where} ORDER BY starts_at ASC LIMIT 200;`,
    ...params
  );
  return rows.map(mapEventRow);
}

function mapEventRow(row: {
  id: string;
  group_id: string | null;
  author_user_id: string;
  title: string;
  body: string | null;
  starts_at: Date;
  ends_at: Date;
  push_notify: boolean;
  created_at: Date;
}) {
  return {
    id: row.id,
    groupId: row.group_id,
    authorUserId: row.author_user_id,
    title: row.title,
    body: row.body,
    startsAt: row.starts_at instanceof Date ? row.starts_at.toISOString() : row.starts_at,
    endsAt: row.ends_at instanceof Date ? row.ends_at.toISOString() : row.ends_at,
    pushNotify: row.push_notify,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}
