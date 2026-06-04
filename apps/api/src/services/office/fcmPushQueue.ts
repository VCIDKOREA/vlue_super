import { prisma } from "../../db/client.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";

let initialized = false;

export async function ensureFcmPushQueueTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS office_fcm_push_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      title VARCHAR(200) NOT NULL,
      body VARCHAR(500) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      channel VARCHAR(60) NOT NULL DEFAULT 'office',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      last_error VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_office_fcm_queue_status ON office_fcm_push_queue(status, created_at);"
  );
  initialized = true;
}

export async function enqueueFcmPush(input: {
  userId: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  channel?: string;
}) {
  await ensureFcmPushQueueTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO office_fcm_push_queue (user_id, title, body, payload, channel, status)
      VALUES ($1::uuid, $2, $3, $4::jsonb, $5, 'pending')
      RETURNING id;
    `,
    input.userId,
    input.title,
    input.body.slice(0, 500),
    JSON.stringify(input.payload || {}),
    input.channel || "office_calendar"
  );
  const id = rows[0]?.id;
  if (id) void flushFcmPushQueue(32);
  return id;
}

export async function flushFcmPushQueue(limit = 32) {
  await ensureFcmPushQueueTable();
  const pending = await prisma.$queryRawUnsafe<
    Array<{ id: string; user_id: string; title: string; body: string; payload: unknown; channel: string }>
  >(
    `
      SELECT id, user_id, title, body, payload, channel
      FROM office_fcm_push_queue
      WHERE status = 'pending'
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      ORDER BY COALESCE(scheduled_at, created_at) ASC
      LIMIT $1;
    `,
    limit
  );

  for (const row of pending) {
    await prisma.$executeRawUnsafe(
      `UPDATE office_fcm_push_queue SET attempts = attempts + 1 WHERE id = $1::uuid;`,
      row.id
    );
    try {
      const payload =
        row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
      const result = await sendOfficePushToUser(row.user_id, row.title, row.body, {
        ...payload,
        channel: row.channel
      });
      if (result.skipped && result.reason === "send_error") {
        await prisma.$executeRawUnsafe(
          `UPDATE office_fcm_push_queue SET status = 'failed', last_error = $2 WHERE id = $1::uuid;`,
          row.id,
          result.reason || "send_error"
        );
        continue;
      }
      await prisma.$executeRawUnsafe(
        `UPDATE office_fcm_push_queue SET status = 'sent', sent_at = NOW(), last_error = NULL WHERE id = $1::uuid;`,
        row.id
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      await prisma.$executeRawUnsafe(
        `UPDATE office_fcm_push_queue SET status = 'failed', last_error = $2 WHERE id = $1::uuid;`,
        row.id,
        msg.slice(0, 500)
      );
    }
  }
}
