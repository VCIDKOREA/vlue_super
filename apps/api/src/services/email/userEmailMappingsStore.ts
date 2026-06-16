import { prisma } from "../../db/client.js";

export type MembershipStatus = "FREE" | "PREMIUM";

export type UserEmailMappingRow = {
  id: string;
  user_id: string;
  membership_status: MembershipStatus;
  virtual_email_prefix: string;
  user_company_slug: string | null;
  full_virtual_email: string;
  target_master_email: string | null;
  created_at: Date;
  updated_at: Date;
};

export type EmailForwardingNotificationRow = {
  id: string;
  user_id: string;
  from_address: string;
  subject: string;
  full_virtual_email: string;
  created_at: Date;
};

let initialized = false;

export async function ensureUserEmailMappingsTables() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_email_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      membership_status VARCHAR(20) NOT NULL DEFAULT 'FREE',
      virtual_email_prefix VARCHAR(64) NOT NULL,
      user_company_slug VARCHAR(64),
      full_virtual_email VARCHAR(254) NOT NULL UNIQUE,
      target_master_email VARCHAR(254),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_user_email_mappings_full ON user_email_mappings(full_virtual_email);"
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS email_forwarding_notification_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_address VARCHAR(254) NOT NULL,
      subject VARCHAR(500) NOT NULL DEFAULT '',
      full_virtual_email VARCHAR(254) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_email_fwd_notif_user ON email_forwarding_notification_logs(user_id, created_at DESC);"
  );
  initialized = true;
}

export async function findMappingByFullVirtualEmail(
  fullVirtualEmail: string
): Promise<UserEmailMappingRow | null> {
  await ensureUserEmailMappingsTables();
  const email = String(fullVirtualEmail || "").trim().toLowerCase();
  if (!email) return null;
  const rows = await prisma.$queryRawUnsafe<UserEmailMappingRow[]>(
    `SELECT * FROM user_email_mappings WHERE LOWER(full_virtual_email) = $1 LIMIT 1`,
    email
  );
  return rows[0] || null;
}

export async function findMappingByUserId(userId: string): Promise<UserEmailMappingRow | null> {
  await ensureUserEmailMappingsTables();
  const rows = await prisma.$queryRawUnsafe<UserEmailMappingRow[]>(
    `SELECT * FROM user_email_mappings WHERE user_id = $1::uuid LIMIT 1`,
    userId
  );
  return rows[0] || null;
}

export async function findMappingByFullVirtualEmailExceptUser(
  fullVirtualEmail: string,
  exceptUserId: string
): Promise<UserEmailMappingRow | null> {
  await ensureUserEmailMappingsTables();
  const email = String(fullVirtualEmail || "").trim().toLowerCase();
  const rows = await prisma.$queryRawUnsafe<UserEmailMappingRow[]>(
    `
      SELECT * FROM user_email_mappings
      WHERE LOWER(full_virtual_email) = $1 AND user_id <> $2::uuid
      LIMIT 1
    `,
    email,
    exceptUserId
  );
  return rows[0] || null;
}

export async function upsertUserEmailMapping(input: {
  userId: string;
  membershipStatus: MembershipStatus;
  virtualEmailPrefix: string;
  userCompanySlug: string | null;
  fullVirtualEmail: string;
  targetMasterEmail?: string | null;
}): Promise<UserEmailMappingRow> {
  await ensureUserEmailMappingsTables();
  const existing = await findMappingByUserId(input.userId);
  if (existing) {
    const rows = await prisma.$queryRawUnsafe<UserEmailMappingRow[]>(
      `
        UPDATE user_email_mappings SET
          membership_status = $2,
          virtual_email_prefix = $3,
          user_company_slug = $4,
          full_virtual_email = $5,
          target_master_email = COALESCE($6, target_master_email),
          updated_at = NOW()
        WHERE user_id = $1::uuid
        RETURNING *;
      `,
      input.userId,
      input.membershipStatus,
      input.virtualEmailPrefix,
      input.userCompanySlug,
      input.fullVirtualEmail.toLowerCase(),
      input.targetMasterEmail ?? null
    );
    return rows[0]!;
  }

  const rows = await prisma.$queryRawUnsafe<UserEmailMappingRow[]>(
    `
      INSERT INTO user_email_mappings (
        user_id, membership_status, virtual_email_prefix, user_company_slug,
        full_virtual_email, target_master_email
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6)
      RETURNING *;
    `,
    input.userId,
    input.membershipStatus,
    input.virtualEmailPrefix,
    input.userCompanySlug,
    input.fullVirtualEmail.toLowerCase(),
    input.targetMasterEmail ?? null
  );
  return rows[0]!;
}

export async function updateTargetMasterEmail(
  userId: string,
  targetMasterEmail: string
): Promise<UserEmailMappingRow | null> {
  await ensureUserEmailMappingsTables();
  const rows = await prisma.$queryRawUnsafe<UserEmailMappingRow[]>(
    `
      UPDATE user_email_mappings SET
        target_master_email = $2,
        updated_at = NOW()
      WHERE user_id = $1::uuid
      RETURNING *;
    `,
    userId,
    targetMasterEmail.toLowerCase()
  );
  return rows[0] || null;
}

export async function insertForwardingNotification(input: {
  userId: string;
  fromAddress: string;
  subject: string;
  fullVirtualEmail: string;
}): Promise<EmailForwardingNotificationRow> {
  await ensureUserEmailMappingsTables();
  const rows = await prisma.$queryRawUnsafe<EmailForwardingNotificationRow[]>(
    `
      INSERT INTO email_forwarding_notification_logs (user_id, from_address, subject, full_virtual_email)
      VALUES ($1::uuid, $2, $3, $4)
      RETURNING *;
    `,
    input.userId,
    input.fromAddress.slice(0, 254),
    input.subject.slice(0, 500),
    input.fullVirtualEmail.toLowerCase()
  );
  return rows[0]!;
}

export async function listForwardingNotifications(
  userId: string,
  limit = 50
): Promise<EmailForwardingNotificationRow[]> {
  await ensureUserEmailMappingsTables();
  const cap = Math.min(Math.max(limit, 1), 100);
  return prisma.$queryRawUnsafe<EmailForwardingNotificationRow[]>(
    `
      SELECT * FROM email_forwarding_notification_logs
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2
    `,
    userId,
    cap
  );
}
