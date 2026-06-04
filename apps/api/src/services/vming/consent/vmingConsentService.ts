import { prisma } from "../../../db/client.js";
import { ssePublish } from "../../../realtime/sseHub.js";
import { encryptConsentField } from "./vmingConsentCrypto.js";
import { flushVmingCache } from "./vmingContextCache.js";

export const CONSENT_VERSION = "2025.06.01";
export type ConsentMode = "all" | "majority" | "partial";
export type ConsentStatus = "pending" | "accepted" | "declined" | "withdrawn";

let schemaReady = false;

export async function ensureVmingConsentSchema() {
  if (schemaReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS vming_room_consent_config (
      room_id VARCHAR(120) PRIMARY KEY,
      consent_mode VARCHAR(20) NOT NULL DEFAULT 'all',
      consent_version VARCHAR(20) NOT NULL DEFAULT '2025.06.01',
      requested_by UUID NOT NULL,
      room_expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS room_member_consent (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id VARCHAR(120) NOT NULL,
      user_id UUID NOT NULL,
      user_name VARCHAR(120),
      consent_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      consent_mode VARCHAR(20) NOT NULL DEFAULT 'all',
      consented_at TIMESTAMPTZ,
      withdrawn_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      consent_version VARCHAR(20) NOT NULL DEFAULT '2025.06.01',
      ip_address_enc TEXT,
      device_info_enc TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (room_id, user_id)
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS consent_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id VARCHAR(120) NOT NULL,
      user_id UUID,
      action VARCHAR(40) NOT NULL,
      action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      triggered_by UUID,
      memo TEXT,
      meta_enc TEXT
    );
  `);
  schemaReady = true;
}

type MemberRow = {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string | null;
  consent_status: string;
  consent_mode: string;
  expires_at: Date | null;
};

export async function resolveRoomMemberIds(roomId: string): Promise<Array<{ userId: string; userName: string }>> {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (room) {
    const names = await prisma.user.findMany({
      where: { id: { in: [room.participantLow, room.participantHigh] } },
      select: { id: true, legalName: true, publicHandle: true }
    });
    const label = (id: string) => {
      const u = names.find((n) => n.id === id);
      return u?.legalName || u?.publicHandle || "멤버";
    };
    return [
      { userId: room.participantLow, userName: label(room.participantLow) },
      { userId: room.participantHigh, userName: label(room.participantHigh) }
    ];
  }
  const rows = await prisma.$queryRawUnsafe<MemberRow[]>(
    `SELECT DISTINCT user_id, user_name FROM room_member_consent WHERE room_id = $1;`,
    roomId
  );
  return rows.map((r) => ({ userId: r.user_id, userName: r.user_name || "멤버" }));
}

export async function createAuditLog(input: {
  roomId: string;
  userId?: string;
  action: string;
  triggeredBy?: string;
  memo?: string;
}) {
  await ensureVmingConsentSchema();
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO consent_audit_logs (room_id, user_id, action, triggered_by, memo)
    VALUES ($1, $2::uuid, $3, $4::uuid, $5);
    `,
    input.roomId,
    input.userId || null,
    input.action,
    input.triggeredBy || null,
    input.memo || null
  );
}

function validityToDate(days: number, sessionOnly: boolean) {
  if (sessionOnly) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function requestVmingConsent(input: {
  roomId: string;
  requestedBy: string;
  consentMode: ConsentMode;
  validityDays?: number;
  sessionOnly?: boolean;
  memberUserIds?: Array<{ userId: string; userName?: string }>;
  requesterName?: string;
}) {
  await ensureVmingConsentSchema();
  const members =
    input.memberUserIds?.length ? input.memberUserIds : await resolveRoomMemberIds(input.roomId);
  if (!members.length) throw new Error("NO_MEMBERS");

  const expiresAt = validityToDate(input.validityDays ?? 90, Boolean(input.sessionOnly));

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO vming_room_consent_config (room_id, consent_mode, requested_by, room_expires_at, is_active, consent_version)
    VALUES ($1, $2, $3::uuid, $4::timestamptz, TRUE, $5)
    ON CONFLICT (room_id) DO UPDATE SET
      consent_mode = EXCLUDED.consent_mode,
      requested_by = EXCLUDED.requested_by,
      room_expires_at = EXCLUDED.room_expires_at,
      is_active = TRUE,
      consent_version = EXCLUDED.consent_version,
      updated_at = NOW();
    `,
    input.roomId,
    input.consentMode,
    input.requestedBy,
    expiresAt?.toISOString() || null,
    CONSENT_VERSION
  );

  for (const m of members) {
    const isRequester = m.userId === input.requestedBy;
    const status = isRequester ? "accepted" : "pending";
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO room_member_consent (room_id, user_id, user_name, consent_status, consent_mode, expires_at, consent_version, consented_at)
      VALUES ($1, $2::uuid, $3, $4, $5, $6::timestamptz, $7, CASE WHEN $4 = 'accepted' THEN NOW() ELSE NULL END)
      ON CONFLICT (room_id, user_id) DO UPDATE SET
        consent_status = EXCLUDED.consent_status,
        consent_mode = EXCLUDED.consent_mode,
        expires_at = EXCLUDED.expires_at,
        consent_version = EXCLUDED.consent_version,
        withdrawn_at = NULL,
        consented_at = CASE WHEN EXCLUDED.consent_status = 'accepted' THEN NOW() ELSE room_member_consent.consented_at END,
        updated_at = NOW();
      `,
      input.roomId,
      m.userId,
      m.userName || "멤버",
      status,
      input.consentMode,
      expiresAt?.toISOString() || null,
      CONSENT_VERSION
    );
  }

  await createAuditLog({
    roomId: input.roomId,
    userId: input.requestedBy,
    action: "requested",
    triggeredBy: input.requestedBy,
    memo: `mode=${input.consentMode}`
  });

  const payload = {
    type: "vlue-vming-consent-update",
    roomId: input.roomId,
    requesterName: input.requesterName || "방장",
    consentMode: input.consentMode,
    members: await getRoomConsentStatus(input.roomId)
  };

  for (const m of members) {
    ssePublish(m.userId, payload);
  }

  return payload;
}

export async function respondVmingConsent(input: {
  roomId: string;
  userId: string;
  status: "accepted" | "declined";
  ipAddress?: string;
  deviceInfo?: string;
}) {
  await ensureVmingConsentSchema();
  const now = new Date();
  const ipEnc = input.ipAddress ? encryptConsentField(input.ipAddress) : null;
  const devEnc = input.deviceInfo ? encryptConsentField(input.deviceInfo) : null;

  if (input.status === "accepted") {
    await prisma.$executeRawUnsafe(
      `
      UPDATE room_member_consent SET
        consent_status = 'accepted',
        consented_at = $3::timestamptz,
        ip_address_enc = $4,
        device_info_enc = $5,
        updated_at = NOW()
      WHERE room_id = $1 AND user_id = $2::uuid;
      `,
      input.roomId,
      input.userId,
      now.toISOString(),
      ipEnc,
      devEnc
    );
  } else {
    await prisma.$executeRawUnsafe(
      `
      UPDATE room_member_consent SET consent_status = 'declined', updated_at = NOW()
      WHERE room_id = $1 AND user_id = $2::uuid;
      `,
      input.roomId,
      input.userId
    );
  }

  await createAuditLog({
    roomId: input.roomId,
    userId: input.userId,
    action: input.status,
    triggeredBy: input.userId
  });

  const status = await getRoomConsentStatus(input.roomId);
  const memberIds = status.members.map((m) => m.userId);
  for (const uid of memberIds) {
    ssePublish(uid, { type: "vlue-vming-consent-update", ...status });
  }

  if (input.status === "declined") {
    const cfg = await getRoomConsentMode(input.roomId);
    if (cfg.consent_mode === "all") {
      await deactivateVmingRoom(input.roomId, input.userId, "member_declined");
    }
  }

  return status;
}

export async function withdrawVmingConsent(input: {
  roomId: string;
  userId: string;
  triggeredBy?: string;
}) {
  await ensureVmingConsentSchema();
  await prisma.$executeRawUnsafe(
    `
    UPDATE room_member_consent SET consent_status = 'withdrawn', withdrawn_at = NOW(), updated_at = NOW()
    WHERE room_id = $1 AND user_id = $2::uuid;
    `,
    input.roomId,
    input.userId
  );
  await createAuditLog({
    roomId: input.roomId,
    userId: input.userId,
    action: "withdrawn",
    triggeredBy: input.triggeredBy || input.userId
  });
  await flushVmingCache(input.roomId);
  await deactivateVmingRoom(input.roomId, input.userId, "consent_withdrawn");
  return getRoomConsentStatus(input.roomId);
}

export async function deactivateVmingRoom(roomId: string, triggeredBy: string, reason: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE vming_room_consent_config SET is_active = FALSE, updated_at = NOW() WHERE room_id = $1;`,
    roomId
  );
  await flushVmingCache(roomId);
  await createAuditLog({
    roomId,
    action: "cache_flushed",
    triggeredBy,
    memo: reason
  });
}

export async function getRoomConsentMode(roomId: string) {
  await ensureVmingConsentSchema();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      consent_mode: string;
      is_active: boolean;
      room_expires_at: Date | null;
      requested_by: string;
    }>
  >(
    `SELECT consent_mode, is_active, room_expires_at, requested_by FROM vming_room_consent_config WHERE room_id = $1 LIMIT 1;`,
    roomId
  );
  return rows[0] || { consent_mode: "all", is_active: false, room_expires_at: null, requested_by: "" };
}

function summarizeVoters(
  members: Array<{
    userId: string;
    userName: string;
    consentStatus: string;
    isValid: boolean;
  }>,
  requesterId: string
) {
  const voters = requesterId
    ? members.filter((m) => m.userId !== requesterId)
    : members.slice(0, Math.max(0, members.length - 1));
  const accepted = voters.filter((m) => m.isValid).length;
  const pending = voters.filter((m) => m.consentStatus === "pending");
  return {
    requiredCount: voters.length,
    acceptedCount: accepted,
    pendingUsers: pending.map((p) => p.userName)
  };
}

export async function getRoomMemberConsents(roomId: string) {
  await ensureVmingConsentSchema();
  return prisma.$queryRawUnsafe<MemberRow[]>(
    `SELECT * FROM room_member_consent WHERE room_id = $1 ORDER BY created_at;`,
    roomId
  );
}

export async function getRoomConsentStatus(roomId: string) {
  const cfg = await getRoomConsentMode(roomId);
  const members = await getRoomMemberConsents(roomId);
  const now = Date.now();
  const mapped = members.map((m) => ({
    userId: m.user_id,
    userName: m.user_name || "멤버",
    consentStatus: m.consent_status,
    expiresAt: m.expires_at?.toISOString() || null,
    isValid:
      m.consent_status === "accepted" &&
      (!m.expires_at || m.expires_at.getTime() > now)
  }));
  const requesterId = String(cfg.requested_by || "");
  const requesterMember = mapped.find((m) => m.userId === requesterId);
  const { requiredCount, acceptedCount, pendingUsers } = summarizeVoters(mapped, requesterId);
  return {
    roomId,
    consentMode: cfg.consent_mode as ConsentMode,
    isActive: cfg.is_active,
    roomExpiresAt: cfg.room_expires_at?.toISOString() || null,
    requestedBy: requesterId,
    requesterName: requesterMember?.userName || "",
    acceptedCount,
    requiredCount,
    totalCount: requiredCount,
    pendingUsers,
    members: mapped
  };
}

export type ConsentVerifyResult =
  | { ok: true; maskedUserIds?: string[] }
  | { ok: false; status: number; body: Record<string, unknown> };

const SKIP_TYPES = new Set(["calendar_parse", "memo_summary"]);

export async function verifyVmingConsentForChat(input: {
  userId: string;
  roomId?: string;
  type?: string;
}): Promise<ConsentVerifyResult> {
  if (!input.roomId || SKIP_TYPES.has(String(input.type || ""))) {
    return { ok: true };
  }

  await ensureVmingConsentSchema();
  const cfg = await getRoomConsentMode(input.roomId);
  if (!cfg.is_active) {
    return {
      ok: false,
      status: 403,
      body: {
        status: "consent_required",
        message: "브이밍 AI를 사용하려면 멤버 동의가 필요해요.",
        roomId: input.roomId
      }
    };
  }

  const members = await getRoomMemberConsents(input.roomId);
  const now = new Date();
  const requesterId = String(cfg.requested_by || "");
  const voters = members.filter((m) => m.user_id !== requesterId);
  const accepted = voters.filter(
    (m) =>
      m.consent_status === "accepted" &&
      (!m.expires_at || m.expires_at.getTime() > now.getTime())
  );
  const total = voters.length;
  const declined = voters.filter(
    (m) => m.consent_status === "declined" || m.consent_status === "withdrawn"
  );

  const mode = cfg.consent_mode as ConsentMode;

  if (mode === "all") {
    if (accepted.length < total) {
      return {
        ok: false,
        status: 403,
        body: {
          status: "consent_pending",
          message: "브이밍 AI 호출 대기 중이에요. 모든 멤버의 동의가 필요해요.",
          accepted_count: accepted.length,
          total_count: total,
          required_count: total,
          pending_users: voters
            .filter((m) => m.consent_status === "pending")
            .map((m) => m.user_name || "멤버")
        }
      };
    }
    return { ok: true };
  }

  if (mode === "majority") {
    const required = Math.ceil(total / 2);
    if (accepted.length < required) {
      return {
        ok: false,
        status: 403,
        body: {
          status: "consent_pending",
          message: "과반수 동의가 필요해요.",
          accepted_count: accepted.length,
          required_count: required
        }
      };
    }
    return { ok: true };
  }

  if (mode === "partial") {
    const nonConsentedIds = voters
      .filter((m) => m.consent_status !== "accepted" || (m.expires_at && m.expires_at <= now))
      .map((m) => m.user_id);
    return { ok: true, maskedUserIds: nonConsentedIds };
  }

  if (declined.length > 0 && mode === "all") {
    return {
      ok: false,
      status: 403,
      body: { status: "consent_declined", message: "동의 거절 멤버가 있어 브이밍을 사용할 수 없어요." }
    };
  }

  return { ok: true };
}

export async function runVmingConsentExpiryJob() {
  await ensureVmingConsentSchema();
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const rows = await prisma.$queryRawUnsafe<
    Array<{ room_id: string; user_id: string; expires_at: Date }>
  >(
    `
    SELECT room_id, user_id, expires_at FROM room_member_consent
    WHERE consent_status = 'accepted' AND expires_at IS NOT NULL
      AND expires_at <= $1::timestamptz AND expires_at > NOW();
    `,
    soon.toISOString()
  );
  for (const row of rows) {
    ssePublish(row.user_id, {
      type: "vlue-vming-consent-expiring",
      roomId: row.room_id,
      message: "브이밍 AI 동의가 7일 후 만료돼요. 계속 사용하려면 재동의해주세요.",
      expiresAt: row.expires_at.toISOString()
    });
  }

  const expired = await prisma.$queryRawUnsafe<Array<{ room_id: string }>>(
    `
    SELECT DISTINCT room_id FROM room_member_consent
    WHERE expires_at IS NOT NULL AND expires_at <= NOW() AND consent_status = 'accepted';
    `
  );
  for (const row of expired) {
    await prisma.$executeRawUnsafe(
      `UPDATE room_member_consent SET consent_status = 'withdrawn', withdrawn_at = NOW() WHERE room_id = $1 AND expires_at <= NOW();`,
      row.room_id
    );
    await flushVmingCache(row.room_id);
    await createAuditLog({ roomId: row.room_id, action: "expired", memo: "cron expiry" });
    await prisma.$executeRawUnsafe(
      `UPDATE vming_room_consent_config SET is_active = FALSE WHERE room_id = $1;`,
      row.room_id
    );
  }
  return { reminded: rows.length, expiredRooms: expired.length };
}
