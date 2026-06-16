import { prisma } from "../../db/client.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";
import { insertInappMailCache } from "./inappMailCacheStore.js";
import { userHasPremiumTier } from "../../middleware/cardGate.js";

const BATCH_SIZE = Number(process.env.VLUE_IMAP_SYNC_BATCH_SIZE || 50);
const TICK_MS = Number(process.env.VLUE_IMAP_SYNC_TICK_MS || 30_000);

export type ExternalMailAccountRow = {
  id: string;
  user_id: string;
  provider: string;
  email: string;
  imap_host: string;
  imap_port: number;
  auth_kind: string;
  credential_ref: string | null;
  last_sync_at: Date | null;
  sync_status: string;
  created_at: Date;
  updated_at: Date;
};

let tablesReady = false;
let schedulerStarted = false;

export async function ensureExternalMailTables() {
  if (tablesReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS external_mail_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(32) NOT NULL DEFAULT 'custom',
      email VARCHAR(254) NOT NULL,
      imap_host VARCHAR(120) NOT NULL DEFAULT 'imap.naver.com',
      imap_port INT NOT NULL DEFAULT 993,
      auth_kind VARCHAR(20) NOT NULL DEFAULT 'app_password',
      credential_ref VARCHAR(255),
      last_sync_at TIMESTAMPTZ,
      sync_status VARCHAR(24) NOT NULL DEFAULT 'idle',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, email)
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS external_mail_sync_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id UUID NOT NULL REFERENCES external_mail_accounts(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      error_message VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_ext_mail_sync_pending ON external_mail_sync_queue(status, scheduled_at ASC);"
  );
  tablesReady = true;
}

export async function listExternalMailAccounts(userId: string) {
  await ensureExternalMailTables();
  return prisma.$queryRawUnsafe<ExternalMailAccountRow[]>(
    `SELECT * FROM external_mail_accounts WHERE user_id = $1::uuid ORDER BY created_at ASC`,
    userId
  );
}

export async function upsertExternalMailAccount(input: {
  userId: string;
  email: string;
  provider?: string;
  imapHost?: string;
  imapPort?: number;
  credentialRef?: string | null;
}) {
  await ensureExternalMailTables();
  const premium = await userHasPremiumTier(input.userId);
  if (!premium) throw new Error("PREMIUM_REQUIRED");

  const email = String(input.email || "").trim().toLowerCase();
  const rows = await prisma.$queryRawUnsafe<ExternalMailAccountRow[]>(
    `
      INSERT INTO external_mail_accounts (user_id, provider, email, imap_host, imap_port, credential_ref, sync_status)
      VALUES ($1::uuid, $2, $3, $4, $5, $6, 'queued')
      ON CONFLICT (user_id, email) DO UPDATE SET
        provider = EXCLUDED.provider,
        imap_host = EXCLUDED.imap_host,
        imap_port = EXCLUDED.imap_port,
        credential_ref = COALESCE(EXCLUDED.credential_ref, external_mail_accounts.credential_ref),
        sync_status = 'queued',
        updated_at = NOW()
      RETURNING *;
    `,
    input.userId,
    input.provider || "custom",
    email,
    input.imapHost || "imap.naver.com",
    input.imapPort || 993,
    input.credentialRef || null
  );
  const account = rows[0]!;
  await enqueueSyncJob(account.user_id, account.id);
  return account;
}

async function enqueueSyncJob(userId: string, accountId: string) {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO external_mail_sync_queue (user_id, account_id, status, scheduled_at)
      VALUES ($1::uuid, $2::uuid, 'pending', NOW())
    `,
    userId,
    accountId
  );
}

/** Mock IMAP fetch — 실제 IMAP는 IMAP_PROVIDER=live + credential vault 연동 시 교체 */
async function fetchMockInboxHeaders(account: ExternalMailAccountRow) {
  const now = Date.now();
  return [
    {
      messageId: `mock-${account.id}-${now}`,
      from: "partner@example.com",
      subject: `[${account.provider}] 연동 테스트 메일`,
      snippet: "외부 메일함 동기화 큐가 정상 동작 중입니다.",
      receivedAt: new Date(now)
    }
  ];
}

async function processOneSyncJob() {
  await ensureExternalMailTables();
  const jobs = await prisma.$queryRawUnsafe<
    Array<{ id: string; user_id: string; account_id: string }>
  >(
    `
      SELECT id, user_id, account_id FROM external_mail_sync_queue
      WHERE status = 'pending' AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC
      LIMIT 1
    `
  );
  const job = jobs[0];
  if (!job) return false;

  await prisma.$executeRawUnsafe(
    `UPDATE external_mail_sync_queue SET status = 'running', started_at = NOW() WHERE id = $1::uuid`,
    job.id
  );

  const accounts = await prisma.$queryRawUnsafe<ExternalMailAccountRow[]>(
    `SELECT * FROM external_mail_accounts WHERE id = $1::uuid LIMIT 1`,
    job.account_id
  );
  const account = accounts[0];
  if (!account) {
    await prisma.$executeRawUnsafe(
      `UPDATE external_mail_sync_queue SET status = 'failed', finished_at = NOW(), error_message = 'account_missing' WHERE id = $1::uuid`,
      job.id
    );
    return true;
  }

  try {
    const provider = (process.env.IMAP_PROVIDER || "mock").toLowerCase();
    const headers =
      provider === "live"
        ? await fetchMockInboxHeaders(account)
        : await fetchMockInboxHeaders(account);

    for (const msg of headers) {
      await insertInappMailCache({
        userId: job.user_id,
        mailSource: "EXTERNAL_IMAP",
        fromAddress: msg.from,
        subject: msg.subject,
        snippet: msg.snippet,
        externalMessageId: msg.messageId,
        receivedAt: msg.receivedAt
      });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE external_mail_accounts SET last_sync_at = NOW(), sync_status = 'idle', updated_at = NOW() WHERE id = $1::uuid`,
      account.id
    );
    await prisma.$executeRawUnsafe(
      `UPDATE external_mail_sync_queue SET status = 'done', finished_at = NOW() WHERE id = $1::uuid`,
      job.id
    );

    if (headers.length > 0) {
      await sendOfficePushToUser(
        job.user_id,
        "새 외부 메일",
        headers[0]!.subject,
        { type: "vlue-email-inapp", mailSource: "EXTERNAL_IMAP" }
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.$executeRawUnsafe(
      `UPDATE external_mail_sync_queue SET status = 'failed', finished_at = NOW(), error_message = $2 WHERE id = $1::uuid`,
      job.id,
      message.slice(0, 500)
    );
  }
  return true;
}

export async function runExternalMailSyncBatch() {
  let processed = 0;
  for (let i = 0; i < BATCH_SIZE; i++) {
    const did = await processOneSyncJob();
    if (!did) break;
    processed++;
  }
  return { processed };
}

export function startExternalMailSyncScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(() => {
    runExternalMailSyncBatch().catch((e) => {
      console.warn("[imap-sync] batch_failed", e);
    });
  }, TICK_MS);
}
