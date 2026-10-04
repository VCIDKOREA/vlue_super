import { prisma } from "../../db/client.js";
import { matchRemoteControlApp } from "../../lib/remoteControlApps.js";
import { ssePublish } from "../../realtime/sseHub.js";
import {
  fcmMessageRemoteForceQuit,
  fcmMessageRemoteNormalDeleted,
  fcmMessageRemoteSecurityStage1,
  fcmMessageRemoteSessionDeleted,
  pushFamilyProtectionFcmToGuardians
} from "./familyProtectionFcmPush.js";
import { ensureFamilyRemoteSecuritySchema } from "./familyRemoteSecuritySchema.js";
import { getOrCreateFamilySettings } from "./familyProtectionSettingsHelper.js";

const FORCE_QUIT_MISS_MS = 30_000;
const DELETED_MISS_MS = 120_000;
const LAST_LOCATION_TTL_MS = 24 * 60 * 60 * 1000;
const STAGE1_DEDUP_MS = 30 * 60 * 1000;

export type RemoteDeviceStatus = "CONNECTED" | "DISCONNECTED" | "TERMINATED";

type RemoteSecurityRow = {
  user_id: string;
  is_remote_active: boolean;
  remote_app_package: string;
  remote_app_label: string;
  remote_detected_at: Date | null;
  last_heartbeat_at: Date | null;
  device_status: string;
  last_lat: number | null;
  last_lng: number | null;
  last_seen_at: Date | null;
  stage1_notified_at: Date | null;
  stage2_reason: string;
  stage2_notified_at: Date | null;
};

async function displayName(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, nickFeed: true, nickChat: true, publicHandle: true }
  });
  return u?.legalName || u?.nickFeed || u?.nickChat || u?.publicHandle || "가족";
}

/** 가족 원 전체(본인 제외) */
export async function familyPeersExceptSelf(userId: string): Promise<string[]> {
  const links = await prisma.familyProtectionLink.findMany({
    where: {
      status: "active",
      OR: [{ guardianUserId: userId }, { wardUserId: userId }]
    },
    select: { guardianUserId: true, wardUserId: true }
  });
  const ids = new Set<string>();
  for (const link of links) {
    ids.add(link.guardianUserId);
    ids.add(link.wardUserId);
  }
  ids.delete(userId);
  return [...ids];
}

async function remoteAlertsEnabledForUser(userId: string): Promise<boolean> {
  const asWard = await prisma.familyProtectionLink.findMany({
    where: { wardUserId: userId, status: "active" },
    select: { guardianUserId: true }
  });
  if (!asWard.length) {
    const own = await getOrCreateFamilySettings(userId).catch(() => null);
    return own?.alertElderRemoteAppEnabled !== false;
  }
  for (const link of asWard) {
    const settings = await getOrCreateFamilySettings(link.guardianUserId);
    if (settings.alertElderRemoteAppEnabled) return true;
  }
  return false;
}

async function loadState(userId: string): Promise<RemoteSecurityRow | null> {
  await ensureFamilyRemoteSecuritySchema();
  const rows = await prisma.$queryRawUnsafe<RemoteSecurityRow[]>(
    `SELECT user_id, is_remote_active, remote_app_package, remote_app_label,
            remote_detected_at, last_heartbeat_at, device_status,
            last_lat, last_lng, last_seen_at,
            stage1_notified_at, stage2_reason, stage2_notified_at
     FROM family_remote_security_state WHERE user_id = $1::uuid LIMIT 1`,
    userId
  );
  return rows[0] || null;
}

async function freezeLocationFromPresence(userId: string) {
  await ensureFamilyRemoteSecuritySchema();
  const presence = await prisma.locationPresence.findUnique({ where: { userId } });
  if (!presence || presence.lat == null || presence.lng == null) {
    return { lat: null as number | null, lng: null as number | null, seenAt: null as Date | null };
  }
  const seenAt = presence.updatedAt || new Date();
  await prisma.$executeRawUnsafe(
    `UPDATE location_presence
     SET last_lat = $2, last_lng = $3, last_seen_at = $4,
         connection_status = CASE
           WHEN connection_status = 'TERMINATED' THEN connection_status
           ELSE 'DISCONNECTED'
         END
     WHERE user_id = $1::uuid`,
    userId,
    presence.lat,
    presence.lng,
    seenAt
  );
  return { lat: presence.lat, lng: presence.lng, seenAt };
}

async function upsertRemoteState(opts: {
  userId: string;
  isRemoteActive: boolean;
  packageName?: string;
  appLabel?: string;
  deviceStatus?: RemoteDeviceStatus;
  lastLat?: number | null;
  lastLng?: number | null;
  lastSeenAt?: Date | null;
  stage1NotifiedAt?: Date | null;
  stage2Reason?: string;
  stage2NotifiedAt?: Date | null;
  touchHeartbeat?: boolean;
}) {
  await ensureFamilyRemoteSecuritySchema();
  const now = new Date();
  await prisma.$executeRawUnsafe(
    `INSERT INTO family_remote_security_state (
       user_id, is_remote_active, remote_app_package, remote_app_label,
       remote_detected_at, last_heartbeat_at, device_status,
       last_lat, last_lng, last_seen_at,
       stage1_notified_at, stage2_reason, stage2_notified_at, updated_at
     ) VALUES (
       $1::uuid, $2, $3, $4,
       CASE WHEN $2 THEN COALESCE($5, now()) ELSE NULL END,
       CASE WHEN $11 THEN now() ELSE NULL END,
       $6, $7, $8, $9,
       $10, COALESCE($12, ''), $13, now()
     )
     ON CONFLICT (user_id) DO UPDATE SET
       is_remote_active = EXCLUDED.is_remote_active,
       remote_app_package = CASE
         WHEN EXCLUDED.remote_app_package <> '' THEN EXCLUDED.remote_app_package
         ELSE family_remote_security_state.remote_app_package
       END,
       remote_app_label = CASE
         WHEN EXCLUDED.remote_app_label <> '' THEN EXCLUDED.remote_app_label
         ELSE family_remote_security_state.remote_app_label
       END,
       remote_detected_at = CASE
         WHEN EXCLUDED.is_remote_active THEN COALESCE(family_remote_security_state.remote_detected_at, now())
         ELSE family_remote_security_state.remote_detected_at
       END,
       last_heartbeat_at = CASE
         WHEN $11 THEN now()
         ELSE family_remote_security_state.last_heartbeat_at
       END,
       device_status = EXCLUDED.device_status,
       last_lat = COALESCE(EXCLUDED.last_lat, family_remote_security_state.last_lat),
       last_lng = COALESCE(EXCLUDED.last_lng, family_remote_security_state.last_lng),
       last_seen_at = COALESCE(EXCLUDED.last_seen_at, family_remote_security_state.last_seen_at),
       stage1_notified_at = COALESCE(EXCLUDED.stage1_notified_at, family_remote_security_state.stage1_notified_at),
       stage2_reason = CASE
         WHEN COALESCE(EXCLUDED.stage2_reason, '') <> '' THEN EXCLUDED.stage2_reason
         ELSE family_remote_security_state.stage2_reason
       END,
       stage2_notified_at = COALESCE(EXCLUDED.stage2_notified_at, family_remote_security_state.stage2_notified_at),
       updated_at = now()`,
    opts.userId,
    opts.isRemoteActive,
    String(opts.packageName || "").slice(0, 160),
    String(opts.appLabel || "").slice(0, 80),
    now,
    opts.deviceStatus || "CONNECTED",
    opts.lastLat ?? null,
    opts.lastLng ?? null,
    opts.lastSeenAt ?? null,
    opts.stage1NotifiedAt ?? null,
    Boolean(opts.touchHeartbeat),
    opts.stage2Reason || "",
    opts.stage2NotifiedAt ?? null
  );
}

async function notifyFamilyPeers(
  wardUserId: string,
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  const peers = await familyPeersExceptSelf(wardUserId);
  if (!peers.length) return { alerted: 0, peers: [] as string[] };

  for (const ownerUserId of peers) {
    try {
      await prisma.ownerNotification.create({
        data: {
          ownerUserId,
          actorUserId: wardUserId,
          title,
          body,
          payloadJson: {
            type: "vlue-family-protection-alert",
            ...data
          } as never
        }
      });
    } catch (err) {
      console.warn("[remote-security] notification_failed", { ownerUserId, err });
    }
    try {
      ssePublish(ownerUserId, {
        type: "vlue-family-protection-alert",
        wardUserId,
        title,
        body,
        at: new Date().toISOString(),
        ...data
      });
    } catch {
      /* ignore */
    }
  }

  void pushFamilyProtectionFcmToGuardians(peers, title, body, {
    wardUserId,
    ...data
  });

  return { alerted: peers.length, peers };
}

function deepLinkPayload(wardUserId: string, extra: Record<string, unknown> = {}) {
  return {
    mode: "family",
    openLocation: "1",
    focusUserId: wardUserId,
    lastKnownLocation: "1",
    channel: "family_protection",
    ...extra
  };
}

/** 1차: 원격 앱 작동 감지 */
export async function reportRemoteDetected(
  userId: string,
  input: { packageName?: string; appLabel?: string; is_remote_active?: boolean }
) {
  const raw = String(input.packageName || input.appLabel || "").trim();
  const match = raw ? matchRemoteControlApp(raw) : null;
  const isActive = input.is_remote_active !== false;
  if (!isActive) {
    await clearRemoteActive(userId);
    return { ok: true, cleared: true };
  }
  if (raw && !match) {
    return { ok: true, matched: false };
  }

  const enabled = await remoteAlertsEnabledForUser(userId);
  const frozen = await freezeLocationFromPresence(userId);
  const label = match?.label || input.appLabel || "원격제어 앱";
  const prev = await loadState(userId);
  const now = new Date();
  const shouldStage1 =
    enabled &&
    (!prev?.stage1_notified_at ||
      now.getTime() - new Date(prev.stage1_notified_at).getTime() > STAGE1_DEDUP_MS ||
      !prev.is_remote_active);

  await upsertRemoteState({
    userId,
    isRemoteActive: true,
    packageName: raw || prev?.remote_app_package || "",
    appLabel: label,
    deviceStatus: "CONNECTED",
    lastLat: frozen.lat,
    lastLng: frozen.lng,
    lastSeenAt: frozen.seenAt,
    stage1NotifiedAt: shouldStage1 ? now : undefined,
    touchHeartbeat: true
  });

  // presence 온라인 유지 + last_* 보존
  if (frozen.lat != null && frozen.lng != null) {
    await prisma.locationPresence
      .update({
        where: { userId },
        data: { online: true }
      })
      .catch(() => {});
  }

  let alerted = 0;
  if (shouldStage1) {
    const name = await displayName(userId);
    const push = fcmMessageRemoteSecurityStage1(name);
    const r = await notifyFamilyPeers(userId, push.title, push.body, {
      kind: "remote_security_stage1",
      stage: 1,
      appName: label,
      packageName: raw,
      ...deepLinkPayload(userId)
    });
    alerted = r.alerted;
  }

  return {
    ok: true,
    matched: true,
    app: label,
    is_remote_active: true,
    stage1: shouldStage1,
    alerted,
    silentLocal: true
  };
}

/** 원격 활성 중 10초 하트비트 */
export async function recordRemoteSecurityHeartbeat(
  userId: string,
  input: { is_remote_active?: boolean; packageName?: string } = {}
) {
  const active = input.is_remote_active !== false;
  if (!active) {
    await clearRemoteActive(userId);
    return { ok: true, is_remote_active: false };
  }
  const prev = await loadState(userId);
  const frozen = await freezeLocationFromPresence(userId);
  await upsertRemoteState({
    userId,
    isRemoteActive: true,
    packageName: input.packageName || prev?.remote_app_package || "",
    appLabel: prev?.remote_app_label || "",
    deviceStatus: "CONNECTED",
    lastLat: frozen.lat ?? prev?.last_lat ?? null,
    lastLng: frozen.lng ?? prev?.last_lng ?? null,
    lastSeenAt: frozen.seenAt ?? prev?.last_seen_at ?? new Date(),
    touchHeartbeat: true
  });
  return { ok: true, is_remote_active: true };
}

async function clearRemoteActive(userId: string) {
  const prev = await loadState(userId);
  if (!prev) return;
  await upsertRemoteState({
    userId,
    isRemoteActive: false,
    packageName: prev.remote_app_package,
    appLabel: prev.remote_app_label,
    deviceStatus: prev.device_status === "TERMINATED" ? "TERMINATED" : "DISCONNECTED",
    touchHeartbeat: false
  });
}

/** 2차: 강제종료·삭제 등 앱 생명주기 */
export async function reportRemoteAppLifecycle(
  userId: string,
  input: { event: "force_quit" | "deleted" | "disconnect"; is_remote_active?: boolean }
) {
  const event = input.event;
  const prev = await loadState(userId);
  const remoteActive =
    input.is_remote_active === true ||
    Boolean(prev?.is_remote_active) ||
    (prev?.remote_detected_at &&
      Date.now() - new Date(prev.remote_detected_at).getTime() < LAST_LOCATION_TTL_MS &&
      event !== "disconnect");

  const frozen = await freezeLocationFromPresence(userId);
  const status: RemoteDeviceStatus =
    event === "deleted" ? "TERMINATED" : event === "force_quit" ? "DISCONNECTED" : "DISCONNECTED";

  // 이미 동일 stage2 보냈으면 스킵
  const reason =
    event === "deleted"
      ? remoteActive
        ? "remote_deleted"
        : "normal_deleted"
      : event === "force_quit"
        ? "force_quit"
        : "disconnect";

  if (prev?.stage2_notified_at && prev.stage2_reason === reason) {
    await upsertRemoteState({
      userId,
      isRemoteActive: Boolean(remoteActive && event !== "deleted"),
      deviceStatus: status,
      lastLat: frozen.lat,
      lastLng: frozen.lng,
      lastSeenAt: frozen.seenAt,
      touchHeartbeat: false
    });
    return { ok: true, skipped: true, reason };
  }

  await upsertRemoteState({
    userId,
    isRemoteActive: event === "deleted" ? false : Boolean(remoteActive),
    packageName: prev?.remote_app_package || "",
    appLabel: prev?.remote_app_label || "",
    deviceStatus: status,
    lastLat: frozen.lat ?? prev?.last_lat ?? null,
    lastLng: frozen.lng ?? prev?.last_lng ?? null,
    lastSeenAt: frozen.seenAt ?? prev?.last_seen_at ?? new Date(),
    stage2Reason: reason,
    stage2NotifiedAt: new Date(),
    touchHeartbeat: false
  });

  await prisma.$executeRawUnsafe(
    `UPDATE location_presence
     SET online = false,
         connection_status = $2,
         last_lat = COALESCE(last_lat, lat),
         last_lng = COALESCE(last_lng, lng),
         last_seen_at = COALESCE(last_seen_at, updated_at)
     WHERE user_id = $1::uuid`,
    userId,
    status
  );

  const enabled = await remoteAlertsEnabledForUser(userId);
  if (!enabled || event === "disconnect") {
    return { ok: true, alerted: 0, reason, status };
  }

  const name = await displayName(userId);
  const appLabel = prev?.remote_app_label || "원격 앱";
  const push =
    reason === "force_quit"
      ? fcmMessageRemoteForceQuit(name, appLabel)
      : reason === "remote_deleted"
        ? fcmMessageRemoteSessionDeleted(name, appLabel)
        : fcmMessageRemoteNormalDeleted(name);

  const r = await notifyFamilyPeers(userId, push.title, push.body, {
    kind: `remote_security_${reason}`,
    stage: 2,
    reason,
    appName: appLabel,
    ...deepLinkPayload(userId)
  });

  return { ok: true, alerted: r.alerted, reason, status };
}

/** 하트비트 유실 감시 — 가족 지도/크론에서 호출 */
export async function sweepRemoteSecurityHeartbeats(limit = 40) {
  await ensureFamilyRemoteSecuritySchema();
  const rows = await prisma.$queryRawUnsafe<RemoteSecurityRow[]>(
    `SELECT user_id, is_remote_active, remote_app_package, remote_app_label,
            remote_detected_at, last_heartbeat_at, device_status,
            last_lat, last_lng, last_seen_at,
            stage1_notified_at, stage2_reason, stage2_notified_at
     FROM family_remote_security_state
     WHERE is_remote_active = true
        OR (remote_detected_at IS NOT NULL AND remote_detected_at > now() - interval '24 hours')
     ORDER BY updated_at DESC
     LIMIT $1`,
    limit
  );

  const now = Date.now();
  let forceQuit = 0;
  let deleted = 0;
  for (const row of rows) {
    if (!row.is_remote_active && row.stage2_notified_at) continue;
    const hb = row.last_heartbeat_at ? new Date(row.last_heartbeat_at).getTime() : 0;
    if (!hb) continue;
    const miss = now - hb;
    if (miss >= DELETED_MISS_MS && row.stage2_reason !== "remote_deleted") {
      await reportRemoteAppLifecycle(row.user_id, {
        event: "deleted",
        is_remote_active: true
      });
      deleted += 1;
    } else if (
      miss >= FORCE_QUIT_MISS_MS &&
      row.stage2_reason !== "force_quit" &&
      row.stage2_reason !== "remote_deleted"
    ) {
      await reportRemoteAppLifecycle(row.user_id, {
        event: "force_quit",
        is_remote_active: true
      });
      forceQuit += 1;
    }
  }
  return { ok: true, checked: rows.length, forceQuit, deleted };
}

export async function getRemoteSecurityPublicState(userId: string) {
  const row = await loadState(userId);
  if (!row) return null;
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at) : null;
  const within24h =
    lastSeen != null && Date.now() - lastSeen.getTime() <= LAST_LOCATION_TTL_MS;
  return {
    userId: row.user_id,
    is_remote_active: row.is_remote_active,
    deviceStatus: row.device_status,
    remoteAppLabel: row.remote_app_label,
    last_lat: within24h ? row.last_lat : null,
    last_lng: within24h ? row.last_lng : null,
    last_seen_at: within24h && lastSeen ? lastSeen.toISOString() : null,
    lastKnownLocation: Boolean(
      within24h &&
        row.last_lat != null &&
        row.last_lng != null &&
        (row.device_status === "DISCONNECTED" || row.device_status === "TERMINATED")
    ),
    within24h
  };
}

export async function attachLastKnownLocationFields<T extends { userId: string }>(
  members: T[]
): Promise<
  Array<
    T & {
      lastKnownLocation?: boolean;
      last_lat?: number | null;
      last_lng?: number | null;
      last_seen_at?: string | null;
      connectionStatus?: string;
      is_remote_active?: boolean;
    }
  >
> {
  await ensureFamilyRemoteSecuritySchema();
  if (!members.length) return members;
  const ids = members.map((m) => m.userId).filter(Boolean);
  if (!ids.length) return members;

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      user_id: string;
      is_remote_active: boolean;
      device_status: string;
      last_lat: number | null;
      last_lng: number | null;
      last_seen_at: Date | null;
    }>
  >(
    `SELECT user_id, is_remote_active, device_status, last_lat, last_lng, last_seen_at
     FROM family_remote_security_state
     WHERE user_id = ANY($1::uuid[])`,
    ids
  );
  const byId = new Map(rows.map((r) => [r.user_id, r]));

  return members.map((member) => {
    const sec = byId.get(member.userId);
    const presenceLast = member as T & {
      lat?: number | null;
      lng?: number | null;
      updatedAt?: string | null;
      online?: boolean;
      grayscale?: boolean;
      connection_status?: string;
    };

    // location_presence.last_* 는 GET 쪽에서 이미 lat/lng로 녹일 수 있음
    const lastSeenRaw = sec?.last_seen_at || null;
    const lastSeenMs = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0;
    const within24h = lastSeenMs > 0 && Date.now() - lastSeenMs <= LAST_LOCATION_TTL_MS;
    const disconnected =
      sec?.device_status === "DISCONNECTED" ||
      sec?.device_status === "TERMINATED" ||
      presenceLast.online === false ||
      presenceLast.grayscale === true;
    const lat = within24h ? sec?.last_lat ?? presenceLast.lat ?? null : presenceLast.lat ?? null;
    const lng = within24h ? sec?.last_lng ?? presenceLast.lng ?? null : presenceLast.lng ?? null;
    const lastKnownLocation = Boolean(disconnected && within24h && lat != null && lng != null);

    return {
      ...member,
      lat: lastKnownLocation ? lat : presenceLast.lat,
      lng: lastKnownLocation ? lng : presenceLast.lng,
      lastKnownLocation,
      last_lat: within24h ? sec?.last_lat ?? null : null,
      last_lng: within24h ? sec?.last_lng ?? null : null,
      last_seen_at: within24h && lastSeenRaw ? new Date(lastSeenRaw).toISOString() : null,
      connectionStatus: sec?.device_status || presenceLast.connection_status || "CONNECTED",
      is_remote_active: Boolean(sec?.is_remote_active)
    };
  });
}

export { LAST_LOCATION_TTL_MS };
