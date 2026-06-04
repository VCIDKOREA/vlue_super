import { prisma } from "../../db/client.js";

export type RemoteControlAction = "print" | "fax";

let queueInitialized = false;

export async function ensureRemoteControlQueueTable() {
  if (queueInitialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS office_remote_control_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      asset_file_id UUID,
      device_id VARCHAR(120) NOT NULL,
      sender_line_number VARCHAR(40) NOT NULL,
      action VARCHAR(20) NOT NULL,
      status VARCHAR(30) NOT NULL,
      file_url VARCHAR(1000),
      file_name VARCHAR(260),
      error_message VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_office_rcq_user_created ON office_remote_control_queue(user_id, created_at DESC);"
  );
  queueInitialized = true;
}

export async function insertQueueRow(input: {
  userId: string;
  assetFileId: string;
  deviceId: string;
  senderLineNumber: string;
  action: RemoteControlAction;
  status: string;
  fileUrl?: string;
  fileName?: string;
  errorMessage?: string;
}) {
  await ensureRemoteControlQueueTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; status: string; created_at: Date }>
  >(
    `
      INSERT INTO office_remote_control_queue (
        user_id, asset_file_id, device_id, sender_line_number, action, status,
        file_url, file_name, error_message
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, status, created_at;
    `,
    input.userId,
    input.assetFileId,
    input.deviceId,
    input.senderLineNumber,
    input.action,
    input.status,
    input.fileUrl || null,
    input.fileName || null,
    input.errorMessage || null
  );
  return rows[0] || null;
}

export async function updateRemoteControlQueueStatus(
  jobId: string,
  status: string,
  errorMessage?: string
) {
  await ensureRemoteControlQueueTable();
  await prisma.$executeRawUnsafe(
    `
      UPDATE office_remote_control_queue
      SET status = $2, error_message = $3, updated_at = NOW()
      WHERE id = $1::uuid;
    `,
    jobId,
    status,
    errorMessage || null
  );
}

export async function listRemoteControlQueue(userId: string, limit = 100) {
  await ensureRemoteControlQueueTable();
  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      asset_file_id: string | null;
      device_id: string;
      sender_line_number: string;
      action: string;
      status: string;
      file_url: string | null;
      file_name: string | null;
      error_message: string | null;
      created_at: Date;
    }>
  >(
    `
      SELECT id, asset_file_id, device_id, sender_line_number, action, status,
             file_url, file_name, error_message, created_at
      FROM office_remote_control_queue
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2;
    `,
    userId,
    limit
  );
}
