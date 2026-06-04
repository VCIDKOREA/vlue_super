import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { upsertGroupMembers, ensureOfficeCalendarTables } from "../office/officeCalendarService.js";
import { enqueueFcmPush, ensureFcmPushQueueTable } from "../office/fcmPushQueue.js";

export type CalType = "personal" | "group";
export type RepeatType = "none" | "daily" | "weekly" | "monthly";
export type RsvpStatus = "pending" | "accepted" | "declined" | "tentative";

export type CalendarEventInput = {
  authorUserId: string;
  type: CalType;
  groupId?: string | null;
  groupKind?: string | null;
  groupName?: string | null;
  title: string;
  content?: string;
  location?: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  color?: string;
  pushEnabled?: boolean;
  pushBeforeMinutes?: number;
  repeatType?: RepeatType;
  repeatEndDate?: string | null;
  notifyUserIds?: string[];
  memberUserIds?: string[];
};

type EventRow = {
  id: string;
  cal_type: string;
  group_id: string | null;
  group_kind: string | null;
  group_name: string | null;
  author_user_id: string;
  title: string;
  body: string | null;
  location: string | null;
  starts_at: Date;
  ends_at: Date;
  is_all_day: boolean;
  color: string;
  push_notify: boolean;
  push_before_minutes: number;
  repeat_type: string;
  repeat_end_date: Date | null;
  created_at: Date;
  updated_at: Date;
};

let extInitialized = false;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidCalendarUserId(userId: string) {
  return UUID_RE.test(String(userId || "").trim());
}

export async function ensureVlueCalendarSchema() {
  await ensureOfficeCalendarTables();
  if (extInitialized) return;
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS cal_type VARCHAR(20) NOT NULL DEFAULT 'personal';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS location VARCHAR(200);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#8B5CF6';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS push_before_minutes INT NOT NULL DEFAULT 30;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS repeat_type VARCHAR(20) NOT NULL DEFAULT 'none';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS repeat_end_date DATE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS group_kind VARCHAR(20);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS group_name VARCHAR(120);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS calendar_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      calendar_id UUID NOT NULL,
      user_id UUID NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (calendar_id, user_id)
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_calendar_members_cal ON calendar_members(calendar_id);"
  );
  await ensureFcmPushQueueTable();
  await prisma.$executeRawUnsafe(`
    ALTER TABLE office_fcm_push_queue ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
  `);
  extInitialized = true;
}

export function inferGroupKind(groupId: string | null | undefined): string {
  const g = String(groupId || "");
  if (g.startsWith("family:")) return "family";
  if (g.startsWith("friends:")) return "friends";
  if (g.startsWith("work:")) return "work";
  return "group";
}

export function defaultColorForKind(kind: string): string {
  if (kind === "work") return "#3B82F6";
  if (kind === "family") return "#22C55E";
  if (kind === "friends") return "#EAB308";
  return "#8B5CF6";
}

export async function getGroupMemberRole(groupId: string, userId: string): Promise<string | null> {
  await ensureVlueCalendarSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ role: string }>>(
    `SELECT role FROM office_group_members WHERE group_id = $1 AND user_id = $2::uuid LIMIT 1;`,
    groupId,
    userId
  );
  return rows[0]?.role || null;
}

export async function assertCanManageGroup(groupId: string, userId: string) {
  const role = await getGroupMemberRole(groupId, userId);
  if (role === "owner" || role === "admin") return;
  const rows = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*)::int AS c FROM office_group_members WHERE group_id = $1;`,
    groupId
  );
  if ((rows[0]?.c ?? 0) === 0) return;
  throw new Error("FORBIDDEN_GROUP_CALENDAR");
}

export async function assertCanEditEvent(eventId: string, userId: string) {
  const event = await getEventById(eventId);
  if (!event) throw new Error("EVENT_NOT_FOUND");
  if (event.authorUserId === userId) return event;
  if (event.type === "group" && event.groupId) {
    await assertCanManageGroup(event.groupId, userId);
    return event;
  }
  throw new Error("FORBIDDEN_EVENT_EDIT");
}

async function getEventById(eventId: string) {
  await ensureVlueCalendarSchema();
  const rows = await prisma.$queryRawUnsafe<EventRow[]>(
    `SELECT * FROM office_calendars WHERE id = $1::uuid LIMIT 1;`,
    eventId
  );
  return rows[0] ? mapEventRow(rows[0]) : null;
}

function mapEventRow(row: EventRow) {
  const kind = row.group_kind || inferGroupKind(row.group_id);
  const isGroup = row.cal_type === "group" || Boolean(row.group_id);
  return {
    id: row.id,
    type: (isGroup ? "group" : "personal") as CalType,
    groupId: row.group_id,
    groupKind: kind,
    groupName: row.group_name,
    authorUserId: row.author_user_id,
    title: row.title,
    content: row.body,
    location: row.location,
    startAt: row.starts_at instanceof Date ? row.starts_at.toISOString() : String(row.starts_at),
    endAt: row.ends_at instanceof Date ? row.ends_at.toISOString() : String(row.ends_at),
    isAllDay: Boolean(row.is_all_day),
    color: row.color || defaultColorForKind(kind),
    pushEnabled: Boolean(row.push_notify),
    pushBeforeMinutes: Number(row.push_before_minutes) || 30,
    repeatType: (row.repeat_type || "none") as RepeatType,
    repeatEndDate: row.repeat_end_date
      ? row.repeat_end_date instanceof Date
        ? row.repeat_end_date.toISOString().slice(0, 10)
        : String(row.repeat_end_date).slice(0, 10)
      : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

async function insertMembers(calendarId: string, userIds: string[], authorUserId: string) {
  const ids = [...new Set(userIds.filter((id) => id && id !== authorUserId))];
  for (const uid of ids) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO calendar_members (calendar_id, user_id, status)
        VALUES ($1::uuid, $2::uuid, 'pending')
        ON CONFLICT (calendar_id, user_id) DO NOTHING;
      `,
      calendarId,
      uid
    );
  }
}

async function listMemberIdsForGroup(groupId: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
    `SELECT user_id FROM office_group_members WHERE group_id = $1;`,
    groupId
  );
  return rows.map((r) => r.user_id);
}

function formatKoWhen(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function broadcastCalendarSse(
  userIds: string[],
  payload: Record<string, unknown>,
  excludeUserId?: string
) {
  for (const uid of userIds) {
    if (excludeUserId && uid === excludeUserId) continue;
    ssePublish(uid, payload);
  }
}

async function sendImmediateGroupPush(input: {
  targets: string[];
  groupName: string;
  title: string;
  startAt: string;
  eventId: string;
  groupId: string | null;
}) {
  const when = formatKoWhen(input.startAt);
  const body = `[${input.groupName}] ${input.title} ${when} 일정이 있어요`;
  for (const userId of input.targets) {
    await enqueueFcmPush({
      userId,
      title: `📅 ${input.title}`,
      body,
      channel: "office_calendar",
      payload: {
        type: "office-calendar-event",
        eventId: input.eventId,
        groupId: input.groupId
      }
    });
  }
}

export async function scheduleReminderPushes(input: {
  eventId: string;
  targets: string[];
  groupName: string;
  title: string;
  startAt: string;
  pushBeforeMinutes: number;
  groupId: string | null;
}) {
  if (!input.targets.length || input.pushBeforeMinutes <= 0) return;
  const fireAt = new Date(new Date(input.startAt).getTime() - input.pushBeforeMinutes * 60 * 1000);
  if (fireAt.getTime() <= Date.now()) return;
  await ensureFcmPushQueueTable();
  const when = formatKoWhen(input.startAt);
  const body = `[${input.groupName}] ${input.title} ${when} 일정이 있어요`;
  for (const userId of input.targets) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO office_fcm_push_queue (user_id, title, body, payload, channel, status, scheduled_at)
        VALUES ($1::uuid, $2, $3, $4::jsonb, 'office_calendar', 'pending', $5::timestamptz);
      `,
      userId,
      `📅 ${input.title}`,
      body.slice(0, 500),
      JSON.stringify({
        type: "vlue-calendar-remind",
        eventId: input.eventId,
        groupId: input.groupId
      }),
      fireAt.toISOString()
    );
  }
}

export async function createCalendarEvent(input: CalendarEventInput) {
  await ensureVlueCalendarSchema();
  const title = String(input.title || "").trim();
  const startAt = String(input.startAt || "").trim();
  const endAt = String(input.endAt || "").trim();
  if (!title || !startAt || !endAt) throw new Error("title, startAt, endAt are required");

  const isGroup = input.type === "group" && Boolean(input.groupId);
  if (isGroup && input.groupId) {
    await assertCanManageGroup(input.groupId, input.authorUserId);
    if (input.memberUserIds?.length) {
      await upsertGroupMembers(input.groupId, input.memberUserIds, input.authorUserId);
    } else {
      await upsertGroupMembers(input.groupId, [input.authorUserId], input.authorUserId);
    }
  }

  const kind = input.groupKind || inferGroupKind(input.groupId);
  const color = input.color || defaultColorForKind(isGroup ? kind : "personal");

  const rows = await prisma.$queryRawUnsafe<EventRow[]>(
    `
      INSERT INTO office_calendars (
        cal_type, group_id, group_kind, group_name, author_user_id, title, body, location,
        starts_at, ends_at, is_all_day, color, push_notify, push_before_minutes,
        repeat_type, repeat_end_date
      )
      VALUES (
        $1, $2, $3, $4, $5::uuid, $6, $7, $8,
        $9::timestamptz, $10::timestamptz, $11, $12, $13, $14,
        $15, $16::date
      )
      RETURNING *;
    `,
    isGroup ? "group" : "personal",
    isGroup ? input.groupId : null,
    isGroup ? kind : null,
    input.groupName || null,
    input.authorUserId,
    title.slice(0, 100),
    input.content || null,
    input.location?.slice(0, 200) || null,
    startAt,
    endAt,
    input.isAllDay === true,
    color,
    input.pushEnabled !== false,
    input.pushBeforeMinutes ?? 30,
    input.repeatType || "none",
    input.repeatEndDate || null
  );
  const row = rows[0];
  if (!row) throw new Error("CALENDAR_INSERT_FAILED");
  const event = mapEventRow(row);

  let notifyTargets: string[] = [];
  if (isGroup && input.groupId) {
    notifyTargets =
      input.notifyUserIds?.filter((id) => id !== input.authorUserId) ||
      (await listMemberIdsForGroup(input.groupId)).filter((id) => id !== input.authorUserId);
    await insertMembers(event.id, [input.authorUserId, ...notifyTargets], input.authorUserId);
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO calendar_members (calendar_id, user_id, status)
        VALUES ($1::uuid, $2::uuid, 'accepted')
        ON CONFLICT (calendar_id, user_id) DO UPDATE SET status = 'accepted';
      `,
      event.id,
      input.authorUserId
    );
  }

  const groupLabel = input.groupName || input.groupId || "그룹";
  if (isGroup && input.pushEnabled !== false && notifyTargets.length) {
    await sendImmediateGroupPush({
      targets: notifyTargets,
      groupName: groupLabel,
      title: event.title,
      startAt: event.startAt,
      eventId: event.id,
      groupId: event.groupId
    });
    await scheduleReminderPushes({
      eventId: event.id,
      targets: notifyTargets,
      groupName: groupLabel,
      title: event.title,
      startAt: event.startAt,
      pushBeforeMinutes: event.pushBeforeMinutes,
      groupId: event.groupId
    });
  }

  if (isGroup && notifyTargets.length) {
    await broadcastCalendarSse(
      notifyTargets,
      {
        type: "vlue-calendar-new",
        eventId: event.id,
        groupId: event.groupId,
        groupName: groupLabel,
        title: event.title,
        message: `📅 [${groupLabel}] 새 일정이 등록됐어요 — ${event.title}`
      },
      input.authorUserId
    );
  }

  return { ...event, members: await listEventMembers(event.id) };
}

export async function updateCalendarEvent(
  eventId: string,
  userId: string,
  patch: Partial<CalendarEventInput>
) {
  const existing = await assertCanEditEvent(eventId, userId);
  await ensureVlueCalendarSchema();

  const rows = await prisma.$queryRawUnsafe<EventRow[]>(
    `
      UPDATE office_calendars SET
        title = COALESCE($2, title),
        body = COALESCE($3, body),
        location = COALESCE($4, location),
        starts_at = COALESCE($5::timestamptz, starts_at),
        ends_at = COALESCE($6::timestamptz, ends_at),
        is_all_day = COALESCE($7, is_all_day),
        color = COALESCE($8, color),
        push_notify = COALESCE($9, push_notify),
        push_before_minutes = COALESCE($10, push_before_minutes),
        repeat_type = COALESCE($11, repeat_type),
        repeat_end_date = COALESCE($12::date, repeat_end_date),
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *;
    `,
    eventId,
    patch.title?.slice(0, 100) ?? null,
    patch.content ?? null,
    patch.location?.slice(0, 200) ?? null,
    patch.startAt ?? null,
    patch.endAt ?? null,
    patch.isAllDay ?? null,
    patch.color ?? null,
    patch.pushEnabled ?? null,
    patch.pushBeforeMinutes ?? null,
    patch.repeatType ?? null,
    patch.repeatEndDate ?? null
  );
  const event = mapEventRow(rows[0]);
  if (event.type === "group" && event.groupId) {
    const members = await listMemberIdsForGroup(event.groupId);
    await broadcastCalendarSse(members, {
      type: "vlue-calendar-update",
      eventId: event.id,
      groupId: event.groupId,
      title: event.title,
      message: `📅 일정이 수정됐어요 — ${event.title}`
    });
  }
  return { ...event, members: await listEventMembers(event.id) };
}

export async function deleteCalendarEvent(eventId: string, userId: string) {
  const existing = await assertCanEditEvent(eventId, userId);
  await prisma.$executeRawUnsafe(`DELETE FROM calendar_members WHERE calendar_id = $1::uuid;`, eventId);
  await prisma.$executeRawUnsafe(`DELETE FROM office_calendars WHERE id = $1::uuid;`, eventId);
  if (existing.type === "group" && existing.groupId) {
    const members = await listMemberIdsForGroup(existing.groupId);
    await broadcastCalendarSse(members, {
      type: "vlue-calendar-delete",
      eventId,
      groupId: existing.groupId,
      title: existing.title,
      message: `📅 일정이 삭제됐어요 — ${existing.title}`
    });
  }
  return { ok: true };
}

export async function listCalendarEvents(query: {
  userId: string;
  type?: CalType;
  groupId?: string;
  groupKind?: string;
  from?: string;
  to?: string;
}) {
  await ensureVlueCalendarSchema();
  if (!isValidCalendarUserId(query.userId)) {
    return [];
  }
  const clauses: string[] = [];
  const params: unknown[] = [];
  let n = 1;

  clauses.push(
    `(author_user_id = $${n}::uuid OR group_id IN (SELECT group_id FROM office_group_members WHERE user_id = $${n}::uuid))`
  );
  params.push(query.userId);
  n += 1;

  if (query.type === "personal") {
    clauses.push(`group_id IS NULL AND author_user_id = $${n}::uuid`);
    params.push(query.userId);
    n += 1;
  }
  if (query.type === "group") {
    clauses.push(`group_id IS NOT NULL`);
  }
  if (query.groupId) {
    clauses.push(`group_id = $${n++}`);
    params.push(query.groupId);
  }
  if (query.groupKind) {
    clauses.push(`group_kind = $${n++}`);
    params.push(query.groupKind);
  }
  if (query.from) {
    clauses.push(`ends_at >= $${n++}::timestamptz`);
    params.push(query.from);
  }
  if (query.to) {
    clauses.push(`starts_at <= $${n++}::timestamptz`);
    params.push(query.to);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;
  const rows = await prisma.$queryRawUnsafe<EventRow[]>(
    `SELECT * FROM office_calendars ${where} ORDER BY starts_at ASC LIMIT 500;`,
    ...params
  );
  return rows.map(mapEventRow);
}

export async function listEventMembers(calendarId: string) {
  await ensureVlueCalendarSchema();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ user_id: string; status: string; is_read: boolean }>
  >(
    `SELECT user_id, status, is_read FROM calendar_members WHERE calendar_id = $1::uuid;`,
    calendarId
  );
  return rows.map((r) => ({
    userId: r.user_id,
    status: r.status as RsvpStatus,
    isRead: r.is_read
  }));
}

export async function setEventRsvp(calendarId: string, userId: string, status: RsvpStatus) {
  await ensureVlueCalendarSchema();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO calendar_members (calendar_id, user_id, status, is_read)
      VALUES ($1::uuid, $2::uuid, $3, TRUE)
      ON CONFLICT (calendar_id, user_id)
      DO UPDATE SET status = EXCLUDED.status, is_read = TRUE, updated_at = NOW();
    `,
    calendarId,
    userId,
    status === "tentative" ? "pending" : status
  );
  return listEventMembers(calendarId);
}

export async function getCalendarEventDetail(eventId: string, userId: string) {
  const event = await getEventById(eventId);
  if (!event) throw new Error("EVENT_NOT_FOUND");
  if (event.type === "personal" && event.authorUserId !== userId) {
    throw new Error("FORBIDDEN_EVENT_VIEW");
  }
  if (event.type === "group" && event.groupId) {
    const role = await getGroupMemberRole(event.groupId, userId);
    const isAuthor = event.authorUserId === userId;
    if (!role && !isAuthor) throw new Error("FORBIDDEN_EVENT_VIEW");
  }
  const members = await listEventMembers(eventId);
  return { ...event, members };
}
