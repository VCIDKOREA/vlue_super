import { prisma } from "../../db/client.js";
import { reverseGeocodeKakao } from "../../integrations/kakao/kakaoReverseGeocode.js";
import { reverseGeocodeGoogle, addressLooksDetailed } from "../../integrations/google/googleMapsGeocode.js";
import { reverseGeocodeNominatim } from "../../integrations/geo/nominatimReverse.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";
import { ensureSafetyPatchSchema } from "./safetyPatchSchema.js";

export const PATCH_WINDOW_MS = 24 * 60 * 60 * 1000;
export const PATCH_WARN_MS = 30 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(String(value || "").trim());
}

export function remainingMs(lastPatchedAt: Date | null, now = Date.now()) {
  if (!lastPatchedAt) return 0;
  return Math.max(0, lastPatchedAt.getTime() + PATCH_WINDOW_MS - now);
}

type SessionRow = { last_patched_at: Date };

export type SafetyPatchIntegrity = {
  installerPackageName?: string | null;
  playStoreInstall?: boolean;
  emulator?: boolean;
  rooted?: boolean;
};

export type SafetyPatchLiveInput = {
  batteryPct: number | null;
  isCharging: boolean;
  lat: number | null;
  lng: number | null;
  locationStatus: string;
  integrity: SafetyPatchIntegrity | null;
};

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 안심패치 탭에서 네이티브가 붙인 실시간 스냅샷. 빈 본문은 null. */
export function parseSafetyPatchLive(body: unknown): SafetyPatchLiveInput | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const has = "batteryPct" in o || "lat" in o || "locationStatus" in o || "integrity" in o;
  if (!has) return null;
  const batteryRaw = finiteNumber(o.batteryPct);
  const latRaw = finiteNumber(o.lat);
  const lngRaw = finiteNumber(o.lng);
  let locationStatus = String(o.locationStatus || "").trim().slice(0, 40);
  const lat = latRaw != null && Math.abs(latRaw) <= 90 ? latRaw : null;
  const lng = lngRaw != null && Math.abs(lngRaw) <= 180 ? lngRaw : null;
  if (locationStatus === "ok" && (lat == null || lng == null)) locationStatus = "location_unavailable";
  const integrityRaw = o.integrity;
  let integrity: SafetyPatchIntegrity | null = null;
  if (integrityRaw && typeof integrityRaw === "object") {
    const i = integrityRaw as Record<string, unknown>;
    const installer = String(i.installerPackageName || "").trim().slice(0, 160);
    integrity = {
      installerPackageName: installer || null,
      playStoreInstall: i.playStoreInstall === true,
      emulator: i.emulator === true,
      rooted: i.rooted === true
    };
  }
  return {
    batteryPct: batteryRaw == null ? null : Math.max(0, Math.min(100, Math.round(batteryRaw))),
    isCharging: o.isCharging === true,
    lat: locationStatus === "ok" ? lat : null,
    lng: locationStatus === "ok" ? lng : null,
    locationStatus,
    integrity
  };
}

export async function readSafetyPatchStatus(userId: string) {
  await ensureSafetyPatchSchema();
  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `SELECT last_patched_at FROM safety_patch_sessions WHERE user_id = $1::uuid LIMIT 1`,
    userId
  );
  const last = rows[0]?.last_patched_at ? new Date(rows[0].last_patched_at) : null;
  const left = remainingMs(last);
  return {
    ok: true as const,
    lastPatchedAt: last ? last.toISOString() : null,
    remainingMs: left,
    complete: left > 0,
    warn: left > 0 && left <= PATCH_WARN_MS
  };
}

async function mirrorLivePresence(userId: string, lat: number, lng: number, battery: number | null) {
  const geo = await reverseGeocodeGoogle(lat, lng).catch(() => null);
  const addressLabel = String(geo?.addressLabel || "").slice(0, 240);
  const overseas = {
    isOverseas: Boolean(geo?.isOverseas),
    countryCode: String(geo?.countryCode || "").slice(0, 8),
    countryName: String(geo?.countryName || "").slice(0, 80),
    cityName: String(geo?.cityName || "").slice(0, 80),
    timeZoneId: String(geo?.timeZoneId || "").slice(0, 64)
  };
  await prisma.locationPresence.upsert({
    where: { userId },
    create: {
      userId,
      lat,
      lng,
      addressLabel,
      batteryPct: battery,
      online: true,
      ...overseas
    },
    update: {
      lat,
      lng,
      addressLabel,
      ...(battery == null ? {} : { batteryPct: battery }),
      online: true,
      ...overseas
    }
  });
  await prisma.$executeRawUnsafe(
    `UPDATE location_presence
     SET last_lat = $2, last_lng = $3, last_seen_at = now(), connection_status = 'CONNECTED'
     WHERE user_id = $1::uuid`,
    userId,
    lat,
    lng
  );
}

export async function completeSafetyPatch(userId: string, live?: SafetyPatchLiveInput | null) {
  await ensureSafetyPatchSchema();
  const battery = live?.batteryPct ?? null;
  const locationStatus = live?.locationStatus || "";
  const lat = locationStatus === "ok" ? live?.lat ?? null : null;
  const lng = locationStatus === "ok" ? live?.lng ?? null : null;
  const integrity = live?.integrity || null;
  const hasIntegrity = Boolean(integrity);
  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `
    INSERT INTO safety_patch_sessions (
      user_id, last_patched_at, expiry_notified_at, updated_at,
      battery_pct, is_charging, lat, lng, location_status,
      installer_package, play_store_install, emulator, rooted
    ) VALUES (
      $1::uuid, NOW(), NULL, NOW(),
      $2, $3, $4, $5, $6,
      $7, $8, $9, $10
    )
    ON CONFLICT (user_id) DO UPDATE SET
      last_patched_at = NOW(),
      expiry_notified_at = NULL,
      updated_at = NOW(),
      battery_pct = COALESCE(EXCLUDED.battery_pct, safety_patch_sessions.battery_pct),
      is_charging = CASE
        WHEN EXCLUDED.battery_pct IS NOT NULL THEN EXCLUDED.is_charging
        ELSE safety_patch_sessions.is_charging
      END,
      lat = COALESCE(EXCLUDED.lat, safety_patch_sessions.lat),
      lng = COALESCE(EXCLUDED.lng, safety_patch_sessions.lng),
      location_status = CASE
        WHEN EXCLUDED.location_status <> '' THEN EXCLUDED.location_status
        ELSE safety_patch_sessions.location_status
      END,
      installer_package = CASE WHEN $11::boolean THEN EXCLUDED.installer_package ELSE safety_patch_sessions.installer_package END,
      play_store_install = CASE WHEN $11::boolean THEN EXCLUDED.play_store_install ELSE safety_patch_sessions.play_store_install END,
      emulator = CASE WHEN $11::boolean THEN EXCLUDED.emulator ELSE safety_patch_sessions.emulator END,
      rooted = CASE WHEN $11::boolean THEN EXCLUDED.rooted ELSE safety_patch_sessions.rooted END
    RETURNING last_patched_at
    `,
    userId,
    battery,
    battery == null ? null : live?.isCharging === true,
    lat,
    lng,
    locationStatus,
    hasIntegrity ? integrity?.installerPackageName || "" : null,
    hasIntegrity ? integrity?.playStoreInstall === true : null,
    hasIntegrity ? integrity?.emulator === true : null,
    hasIntegrity ? integrity?.rooted === true : null,
    hasIntegrity
  );
  if (lat != null && lng != null) {
    try {
      await mirrorLivePresence(userId, lat, lng, battery);
    } catch (err) {
      console.warn("[safety-patch] presence mirror failed", err);
    }
  } else if (battery != null) {
    try {
      await prisma.locationPresence.updateMany({
        where: { userId },
        data: { batteryPct: battery, online: true }
      });
    } catch (err) {
      console.warn("[safety-patch] battery mirror failed", err);
    }
  }
  const last = rows[0]?.last_patched_at ? new Date(rows[0].last_patched_at) : new Date();
  return {
    ok: true as const,
    lastPatchedAt: last.toISOString(),
    remainingMs: remainingMs(last),
    complete: true
  };
}

const EXPIRY_TITLE = "TODAY 안심패치";
const EXPIRY_BODY = "안심패치 유효 시간이 곧 종료됩니다. 패치를 진행해 최신 안전 상태를 동기화하세요.";

async function dueUserIds(onlyUserId?: string) {
  if (onlyUserId) {
    return prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
      `
      SELECT user_id::text AS user_id
      FROM safety_patch_sessions
      WHERE user_id = $1::uuid
        AND last_patched_at > NOW() - INTERVAL '24 hours'
        AND last_patched_at <= NOW() - INTERVAL '23 hours 30 minutes'
        AND (expiry_notified_at IS NULL OR expiry_notified_at < last_patched_at)
      `,
      onlyUserId
    );
  }
  return prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
    `
    SELECT user_id::text AS user_id
    FROM safety_patch_sessions
    WHERE last_patched_at > NOW() - INTERVAL '24 hours'
      AND last_patched_at <= NOW() - INTERVAL '23 hours 30 minutes'
      AND (expiry_notified_at IS NULL OR expiry_notified_at < last_patched_at)
    LIMIT 40
    `
  );
}

/** 만료 30분 전 1회 푸시. 이미 보냈으면 건너뛴다. */
export async function notifySafetyPatchExpiry(onlyUserId?: string) {
  await ensureSafetyPatchSchema();
  const due = await dueUserIds(onlyUserId);
  let sent = 0;
  for (const row of due) {
    const userId = String(row.user_id || "");
    if (!isUuid(userId)) continue;
    let pushSent = 0;
    try {
      const push = await sendOfficePushToUser(userId, EXPIRY_TITLE, EXPIRY_BODY, {
        type: "vlue-safety-patch",
        title: EXPIRY_TITLE,
        body: EXPIRY_BODY
      });
      pushSent = push.sent;
    } catch (err) {
      console.warn("[safety-patch] push failed", userId, err);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `
      UPDATE safety_patch_sessions
      SET expiry_notified_at = NOW(), updated_at = NOW()
      WHERE user_id = $1::uuid
        AND (expiry_notified_at IS NULL OR expiry_notified_at < last_patched_at)
      `,
      userId
    );
    if (pushSent > 0) sent += 1;
  }
  return { checked: due.length, sent };
}

let watcherStarted = false;

export function startSafetyPatchExpiryWatcher() {
  if (watcherStarted) return;
  watcherStarted = true;
  const tick = () => {
    notifySafetyPatchExpiry().catch((err) => console.warn("[safety-patch] expiry push failed", err));
  };
  const timer = setInterval(tick, 5 * 60 * 1000);
  if (typeof timer.unref === "function") timer.unref();
  tick();
}

type Snapshot = {
  displayName: string;
  lat: number | null;
  lng: number | null;
  batteryPct: number | null;
  addressLabel: string;
  online: boolean;
  fresh: boolean;
  updatedAt: Date | null;
};

function computeSafetyIndex(snap: Snapshot) {
  let score = 42;
  if (snap.online) score += 22;
  if (snap.fresh) score += 14;
  if (snap.addressLabel) score += 8;
  if (snap.batteryPct == null) score -= 4;
  else if (snap.batteryPct >= 50) score += 12;
  else if (snap.batteryPct >= 20) score += 4;
  else score -= 14;
  return Math.max(1, Math.min(99, score));
}

function fallbackSummary(snap: Snapshot, safetyIndex: number) {
  const where = snap.addressLabel ? `${snap.addressLabel} 부근에 있습니다.` : "상세 위치는 아직 수신되지 않았습니다.";
  const link = snap.online ? "현재 가족과 연결되어 있습니다." : "최근 위치가 유지되고 있으며 실시간 접속은 잠시 끊겨 있습니다.";
  const battery =
    snap.batteryPct == null ? "배터리 정보는 다음 동기화에서 갱신됩니다." : `배터리 잔량은 ${snap.batteryPct}%입니다.`;
  return `${snap.displayName}님은 ${link}\n${where}\n${battery} 오늘의 안심지수는 ${safetyIndex}입니다.`;
}

async function callGeminiBrief(snap: Snapshot, safetyIndex: number): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = [
    "가족 안심 브리핑을 한국어 2~3문장으로 작성하라.",
    "의료 진단, 범죄 단정, 과장된 위험 경고는 하지 마라.",
    "반드시 JSON만 반환: {\"summary\":\"문장\"}",
    `이름: ${snap.displayName}`,
    `접속: ${snap.online ? "연결됨" : "최근 위치 유지"}`,
    `배터리: ${snap.batteryPct == null ? "없음" : `${snap.batteryPct}%`}`,
    `주소: ${snap.addressLabel || "없음"}`,
    `안심지수: ${safetyIndex}`
  ].join("\n");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 220, temperature: 0.4 }
      })
    });
    const data = (await res.json().catch(() => ({}))) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as { summary?: string };
    const summary = String(parsed.summary || "").trim();
    return summary ? summary.slice(0, 500) : null;
  } catch (err) {
    console.warn("[safety-patch] gemini failed", err);
    return null;
  }
}

async function canViewTarget(viewerId: string, targetId: string, roomId: string) {
  if (viewerId === targetId) return true;
  const link = await prisma.familyProtectionLink.findFirst({
    where: {
      status: "active",
      OR: [
        { guardianUserId: viewerId, wardUserId: targetId },
        { guardianUserId: targetId, wardUserId: viewerId }
      ]
    },
    select: { id: true }
  });
  if (link) return true;
  if (!isUuid(roomId)) return false;
  const members = await prisma.vmapMember.findMany({
    where: { roomId, userId: { in: [viewerId, targetId] } },
    select: { userId: true }
  });
  const ids = new Set(members.map((member) => member.userId));
  return ids.has(viewerId) && ids.has(targetId);
}

async function loadSnapshot(targetId: string, roomId: string): Promise<Snapshot> {
  const [user, presence, member] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetId },
      select: { legalName: true, publicHandle: true, email: true }
    }),
    prisma.locationPresence.findUnique({ where: { userId: targetId } }),
    isUuid(roomId)
      ? prisma.vmapMember.findUnique({ where: { roomId_userId: { roomId, userId: targetId } } })
      : Promise.resolve(null)
  ]);
  const lat = member?.lat ?? presence?.lat ?? null;
  const lng = member?.lng ?? presence?.lng ?? null;
  const pinnedDemo = String(user?.email || "").endsWith("@vlue.demo");
  let address = String(presence?.addressLabel || "").trim();
  if (lat != null && lng != null && !addressLooksDetailed(address)) {
    const geo = await reverseGeocodeGoogle(lat, lng);
    if (geo?.addressLabel && addressLooksDetailed(geo.addressLabel)) {
      address = geo.addressLabel;
    } else if (!presence?.isOverseas) {
      const detailed = await reverseGeocodeKakao(lat, lng);
      if (detailed) address = detailed;
    }
    if (!addressLooksDetailed(address)) {
      const named = await reverseGeocodeNominatim(lat, lng);
      if (addressLooksDetailed(named)) address = named;
    }
  }
  const updatedAt = member?.updatedAt || presence?.updatedAt || null;
  const fresh = pinnedDemo || Boolean(updatedAt && Date.now() - updatedAt.getTime() < 15 * 60 * 1000);
  const online = pinnedDemo
    ? presence?.online !== false
    : member
      ? member.online !== false && fresh
      : Boolean(presence?.online) && fresh;
  return {
    displayName: presence?.displayName || user?.legalName || user?.publicHandle || member?.displayName || "가족",
    lat,
    lng,
    batteryPct: member?.batteryPct ?? presence?.batteryPct ?? null,
    addressLabel: address.slice(0, 240),
    online,
    fresh,
    updatedAt
  };
}

export async function buildFamilySafetyReport(viewerId: string, targetId: string, roomId = "") {
  await ensureSafetyPatchSchema();
  if (!isUuid(targetId) || !(await canViewTarget(viewerId, targetId, roomId))) {
    return { ok: false as const, error: "가족 또는 같은 지도 참여자만 볼 수 있습니다." };
  }
  const snap = await loadSnapshot(targetId, roomId);
  const cached = await prisma.$queryRawUnsafe<
    Array<{ summary: string; safety_index: number; address_label: string; battery_pct: number | null; created_at: Date }>
  >(
    `
    SELECT summary, safety_index, address_label, battery_pct, created_at
    FROM safety_patch_reports
    WHERE viewer_user_id = $1::uuid AND target_user_id = $2::uuid
      AND created_at > NOW() - INTERVAL '2 hours'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    viewerId,
    targetId
  );
  const hit = cached[0];
  const cacheFresh =
    hit &&
    (!snap.updatedAt || new Date(hit.created_at).getTime() >= snap.updatedAt.getTime() - 60_000);
  if (hit && cacheFresh) {
    return {
      ok: true as const,
      summary: hit.summary,
      safetyIndex: hit.safety_index,
      addressLabel: snap.addressLabel || hit.address_label || "",
      batteryPct: snap.batteryPct ?? hit.battery_pct,
      online: snap.online,
      source: "cache" as const
    };
  }
  const safetyIndex = computeSafetyIndex(snap);
  const generated = await callGeminiBrief(snap, safetyIndex);
  const summary = generated || fallbackSummary(snap, safetyIndex);
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO safety_patch_reports (
      viewer_user_id, target_user_id, summary, safety_index, address_label, battery_pct
    ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
    `,
    viewerId,
    targetId,
    summary,
    safetyIndex,
    snap.addressLabel,
    snap.batteryPct
  );
  return {
    ok: true as const,
    summary,
    safetyIndex,
    addressLabel: snap.addressLabel,
    batteryPct: snap.batteryPct,
    online: snap.online,
    source: generated ? ("gemini" as const) : ("fallback" as const)
  };
}

export type PatchBriefLine = { icon: string; title: string; body: string };

type LiveSessionRow = {
  battery_pct: number | null;
  is_charging: boolean | null;
  location_status: string | null;
  installer_package: string | null;
  play_store_install: boolean | null;
  emulator: boolean | null;
  rooted: boolean | null;
};

function locationBrief(status: string, place: string) {
  if (status === "permission_denied") return "위치 권한이 없어 이번 패치에서 현재 GPS를 받지 못했습니다.";
  if (status === "gps_disabled") return "GPS가 꺼져 있어 현재 위치를 새로 받지 못했습니다.";
  if (status === "timeout" || status === "location_unavailable") {
    return "현재 위치 수신에 실패했습니다. GPS를 켠 뒤 다시 패치해 주세요.";
  }
  return String(place).slice(0, 120);
}

function integrityBrief(live: LiveSessionRow | undefined) {
  if (!live || live.play_store_install == null) {
    return "24시간 TODAY 안심패치 세션이 활성화되었습니다.";
  }
  const play = live.play_store_install === true;
  const emulator = live.emulator === true;
  const rooted = live.rooted === true;
  if (play && !emulator && !rooted) {
    return "구글 플레이 스토어 정식 설치입니다. 에뮬레이터·루팅 징후는 없습니다.";
  }
  const bits: string[] = [];
  if (!play) bits.push(`설치원 ${live.installer_package || "확인 불가"}`);
  if (emulator) bits.push("에뮬레이터");
  if (rooted) bits.push("루팅");
  return `위·변조 점검: ${bits.join(" · ")}`;
}

/** 패치 직후/접속 시 잠깐 보여주는 오늘의 안심패치 요약 */
async function countDeviceThreats24h(userId: string) {
  let malware = 0;
  let remote = 0;
  try {
    const { listIncidentsForUser } = await import("../familyProtection/familyCrossSecurityStore.js");
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const incidents = await listIncidentsForUser(userId);
    for (const row of incidents) {
      if (row.wardUserId !== userId) continue;
      const t = new Date(row.createdAt).getTime();
      if (!Number.isFinite(t) || t < since) continue;
      if (row.threatKind === "dangerous_permission_app") malware += 1;
      if (row.threatKind === "remote_control_app") remote += 1;
    }
  } catch {
    /* ignore */
  }
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ kind: string; c: number }>>(
      `
      SELECT kind::text AS kind, COUNT(*)::int AS c
      FROM family_protection_alerts
      WHERE ward_user_id = $1::uuid
        AND created_at > NOW() - INTERVAL '24 hours'
        AND kind::text IN ('elder_remote_control_app')
      GROUP BY kind
      `,
      userId
    );
    for (const row of rows) {
      if (String(row.kind) === "elder_remote_control_app") {
        remote += Number(row.c || 0);
      }
    }
  } catch {
    /* ignore */
  }
  try {
    await import("../familyProtection/familyRemoteSecuritySchema.js").then((m) =>
      m.ensureFamilyRemoteSecuritySchema()
    );
    const remoteRows = await prisma.$queryRawUnsafe<
      Array<{ is_remote_active: boolean; stage1_notified_at: Date | null; remote_detected_at: Date | null }>
    >(
      `
      SELECT is_remote_active, stage1_notified_at, remote_detected_at
      FROM family_remote_security_state
      WHERE user_id = $1::uuid
      LIMIT 1
      `,
      userId
    );
    const st = remoteRows[0];
    if (st?.remote_detected_at && Date.now() - new Date(st.remote_detected_at).getTime() < 24 * 60 * 60 * 1000) {
      /* 원격 세션이 24h 내 감지됐으면 최소 1회로 반영 (알림 카운트와 중복 가능 → max) */
      remote = Math.max(remote, 1);
      if (st.stage1_notified_at) remote = Math.max(remote, 1);
    }
    if (st?.is_remote_active) remote = Math.max(remote, 1);
  } catch {
    /* ignore */
  }
  return { malware, remote };
}

export async function buildTodayPatchBrief(userId: string): Promise<{
  ok: true;
  lines: PatchBriefLine[];
}> {
  await ensureSafetyPatchSchema();
  const report = await buildFamilySafetyReport(userId, userId, "");
  const presence = await prisma.locationPresence.findUnique({ where: { userId } }).catch(() => null);
  let smsSuspect = 0;
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
      `
      SELECT COUNT(*)::int AS c
      FROM fraud_pattern_logs
      WHERE sender_id = $1::uuid
        AND is_suspicious = true
        AND created_at > NOW() - INTERVAL '24 hours'
      `,
      userId
    );
    smsSuspect = Number(rows[0]?.c || 0);
  } catch {
    smsSuspect = 0;
  }

  const threats = await countDeviceThreats24h(userId);
  const liveRows = await prisma.$queryRawUnsafe<LiveSessionRow[]>(
    `
    SELECT battery_pct, is_charging, location_status, installer_package,
           play_store_install, emulator, rooted
    FROM safety_patch_sessions
    WHERE user_id = $1::uuid
    LIMIT 1
    `,
    userId
  ).catch(() => [] as LiveSessionRow[]);
  const live = liveRows[0];

  const reportOk = report.ok === true ? report : null;
  const place =
    reportOk?.addressLabel ||
    presence?.addressLabel ||
    [presence?.cityName, presence?.countryName].filter(Boolean).join(", ") ||
    "위치 동기화 대기";
  const liveBattery = live?.battery_pct;
  const battery =
    liveBattery != null
      ? `${liveBattery}%${live?.is_charging ? " · 충전 중" : ""}`
      : reportOk?.batteryPct != null
        ? `${reportOk.batteryPct}%`
        : presence?.batteryPct != null
          ? `${presence.batteryPct}%`
          : "확인 중";
  const locationStatus = String(live?.location_status || "");
  const gpsLabel =
    locationStatus === "ok"
      ? "GPS 수신"
      : locationStatus === "gps_disabled"
        ? "GPS 꺼짐"
        : locationStatus === "permission_denied"
          ? "위치 권한 없음"
          : locationStatus === "timeout" || locationStatus === "location_unavailable"
            ? "GPS 수신 실패"
            : "GPS";
  const geminiBody = reportOk?.summary
    ? `${reportOk.summary.split("\n")[0]} · 안심지수 ${reportOk.safetyIndex}`
    : "가족 안심 요약을 동기화했습니다.";

  const malwareBody =
    threats.malware > 0
      ? `최근 24시간 기기 악성·위험 권한 APP 감지 ${threats.malware}회`
      : "최근 24시간 기기 악성·위험 권한 APP 감지 없음";
  const remoteBody =
    threats.remote > 0
      ? `최근 24시간 원격제어 앱 활성화·감지 ${threats.remote}회 (TeamViewer·AnyDesk 등)`
      : "최근 24시간 원격제어 앱 활성화 감지 없음";

  const lines: PatchBriefLine[] = [
    { icon: "🤖", title: "Gemini AI 안심요약", body: geminiBody.slice(0, 160) },
    { icon: "📍", title: "위치", body: locationBrief(locationStatus, String(place)) },
    {
      icon: "📡",
      title: "수집 정보",
      body: `배터리 ${battery} · ${gpsLabel} · 접속 상태 동기화`
    },
    {
      icon: "🦠",
      title: "기기 악성 APP 감지",
      body: malwareBody
    },
    {
      icon: "🖥️",
      title: "원격앱 활성화",
      body: remoteBody
    },
    {
      icon: "💬",
      title: "SMS 스미싱",
      body:
        smsSuspect > 0
          ? `최근 24시간 의심 문자 ${smsSuspect}건 점검`
          : "의심 문자 모니터링 · 보안 스캔 동기화"
    },
    {
      icon: "🛡️",
      title: "보안패치",
      body: integrityBrief(live)
    }
  ];
  return { ok: true, lines };
}
