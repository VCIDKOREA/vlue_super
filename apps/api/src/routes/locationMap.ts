import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { fetchKakaoCarDirections } from "../integrations/kakao/kakaoMobilityDirections.js";
import { searchKakaoLocalList } from "../integrations/kakao/kakaoLocalSearch.js";
import { reverseGeocodeGoogle } from "../integrations/google/googleMapsGeocode.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import { ssePublish } from "../realtime/sseHub.js";
import { sendShowcaseSocialPushToUser } from "../services/fcmNotificationService.js";
import { AUTO_ARRIVE_METERS, isVmapDropout, vmapRoomReadyToClose } from "../services/location/vmapArrival.js";
import { ensureLocationPresenceOverseasSchema } from "../services/location/locationPresenceOverseasSchema.js";
import { ensureFamilyRemoteSecuritySchema } from "../services/familyProtection/familyRemoteSecuritySchema.js";
import {
  attachLastKnownLocationFields,
  sweepRemoteSecurityHeartbeats
} from "../services/familyProtection/familyRemoteSecurityService.js";
import { resolveUserPolicy } from "../services/membership/userPolicyManager.js";

const LAST_LOCATION_TTL_MS = 24 * 60 * 60 * 1000;

const FAREWELL = "전원 목적지까지 안전하게 도착하셨습니다. 오늘도 즐거운 하루 되십시요";

export const locationMapRoutes = new Hono();

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clip(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function paramId(c: { req: { param: (name: string) => string | undefined } }) {
  return String(c.req.param("id") || "");
}

async function me(c: { get: (key: "vlueUserId") => string | undefined }) {
  return c.get("vlueUserId") || "";
}

/** 활성 가족보호 링크로 연결된 회원 원(본인 포함) */
async function familyCircleUserIds(userId: string): Promise<string[]> {
  const links = await prisma.familyProtectionLink.findMany({
    where: {
      status: "active",
      OR: [{ guardianUserId: userId }, { wardUserId: userId }]
    },
    select: { guardianUserId: true, wardUserId: true }
  });
  const ids = new Set<string>([userId]);
  for (const link of links) {
    ids.add(link.guardianUserId);
    ids.add(link.wardUserId);
  }
  return [...ids];
}

/** 유료·가족플랜 피보호자 → 시안 블루 VLUE 인증 배지 */
async function cyanBadgeByUserIds(userIds: string[]): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  const ids = [...new Set(userIds.filter(Boolean))];
  await Promise.all(
    ids.map(async (id) => {
      try {
        const policy = await resolveUserPolicy(id);
        map.set(id, Boolean(policy.cyanBadgeActive));
      } catch {
        map.set(id, false);
      }
    })
  );
  return map;
}

async function notifyLocationChat(opts: {
  recipientIds: string[];
  actorUserId: string;
  actorName: string;
  title: string;
  body: string;
  mode: "vmap" | "family";
  roomId?: string;
  /** 있으면 actorName 접두 없이 이 문구를 푸시·알림함에 그대로 사용 */
  noticeBody?: string;
}) {
  const preview = String(opts.body || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const noticeBody =
    String(opts.noticeBody || "").trim() ||
    `${opts.actorName}: ${preview || "(메시지)"}`;
  for (const ownerUserId of opts.recipientIds) {
    if (!ownerUserId || ownerUserId === opts.actorUserId) continue;
    let notificationId = "";
    try {
      const row = await prisma.ownerNotification.create({
        data: {
          ownerUserId,
          actorUserId: opts.actorUserId,
          title: opts.title,
          body: noticeBody,
          payloadJson: {
            type: opts.mode === "vmap" ? "vlue-vmap-message" : "vlue-family-location-message",
            mode: opts.mode,
            roomId: opts.roomId || "",
            actorUserId: opts.actorUserId,
            actorName: opts.actorName
          }
        }
      });
      notificationId = row.id;
    } catch (err) {
      console.warn("[location] chat notification_failed", err);
    }
    const payload = {
      type: opts.mode === "vmap" ? "vlue-vmap-message" : "vlue-family-location-message",
      title: opts.title,
      body: noticeBody,
      message: noticeBody,
      mode: opts.mode,
      roomId: opts.roomId || "",
      actorUserId: opts.actorUserId,
      actorName: opts.actorName,
      notificationId,
      at: new Date().toISOString()
    };
    try {
      ssePublish(ownerUserId, payload);
    } catch (err) {
      console.warn("[location] chat sse_failed", err);
    }
    void sendShowcaseSocialPushToUser(ownerUserId, opts.title, noticeBody, {
      type: payload.type,
      mode: opts.mode,
      roomId: opts.roomId || "",
      actorUserId: opts.actorUserId,
      actorName: opts.actorName,
      notificationId
    }).catch((err) => console.warn("[location] chat fcm_failed", err));
  }
}

/** 지도 마커용. data URL 은 응답이 커지므로 http 사진만 붙인다. */
async function profilePhotos(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const cards = await prisma.digitalCard.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, photoUrl: true }
  });
  for (const card of cards) {
    const url = String(card.photoUrl || "").trim();
    if (url.startsWith("http://") || url.startsWith("https://")) map.set(card.userId, url);
  }
  return map;
}

function activeSponsorWhere(now: Date) {
  return {
    active: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
    ]
  };
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function seoulDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function roomRecord(room: { closingReason: string; logBody: string }) {
  return {
    title: "V-Map",
    body: room.logBody,
    reason: room.closingReason || "host",
    farewell: room.closingReason === "arrived" ? FAREWELL : ""
  };
}

const arrivalTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleArrivalClose(roomId: string) {
  if (arrivalTimers.has(roomId)) return;
  const timer = setTimeout(() => {
    arrivalTimers.delete(roomId);
    closeVmapRoom(roomId, "arrived").catch(() => {});
  }, 5000);
  arrivalTimers.set(roomId, timer);
}
async function maybeBeginArrival(roomId: string) {
  const room = await prisma.vmapRoom.findFirst({ where: { id: roomId, active: true } });
  if (!room?.placeReady || room.closingAt) return room;
  const moving = await prisma.vmapMember.findMany({ where: { roomId, departed: true } });
  if (!vmapRoomReadyToClose(moving)) return room;
  const claimed = await prisma.vmapRoom.updateMany({
    where: { id: roomId, active: true, closingAt: null },
    data: { closingAt: new Date(), closingReason: "arrived" }
  });
  if (claimed.count !== 1) return prisma.vmapRoom.findUnique({ where: { id: roomId } });
  scheduleArrivalClose(roomId);
  return prisma.vmapRoom.findUnique({ where: { id: roomId } });
}

/** 방 종료 기록을 참가자 알림함에 남기고 멤버·대화는 지운다. */
async function closeVmapRoom(roomId: string, reason: "arrived" | "host") {
  const room = await prisma.vmapRoom.findUnique({ where: { id: roomId } });
  if (!room) return null;
  if (!room.active && room.logBody) return roomRecord(room);
  const members = await prisma.vmapMember.findMany({ where: { roomId } });
  const host = await prisma.user.findUnique({
    where: { id: room.hostUserId },
    select: { legalName: true, publicHandle: true }
  });
  const creator = String(host?.legalName || host?.publicHandle || "생성자").replace(/^@+/, "").trim() || "생성자";
  const participants = members.map((member) => member.displayName || "참여자");
  const destination = room.placeLabel || "목적지";
  const date = seoulDateLabel();
  const body = room.logBody || `${date}\n생성자 ${creator}\n참가 ${participants.join(", ") || creator}\n목적지 ${destination}`;
  const payload = JSON.stringify({ kind: "vmap_record", date, creator, participants, destination });
  const claimed = await prisma.$queryRaw<Array<{ claimed: number }>>`
    WITH claim AS (
      UPDATE vmap_rooms
      SET active = false,
          log_body = ${body},
          closing_reason = ${reason},
          updated_at = now()
      WHERE id = CAST(${roomId} AS uuid) AND active = true
      RETURNING id, host_user_id
    ),
    roster AS (
      SELECT m.user_id, c.host_user_id
      FROM vmap_members m
      JOIN claim c ON m.room_id = c.id
    ),
    inserted AS (
      INSERT INTO owner_notifications (
        id, owner_user_id, actor_user_id, title, body, status, pin_key, payload_json, created_at
      )
      SELECT gen_random_uuid(),
             roster.user_id,
             roster.host_user_id,
             'V-Map',
             ${body},
             'unread'::"NotificationStatus",
             'vmap:' || CAST(${roomId} AS text),
             CAST(${payload} AS jsonb),
             now()
      FROM roster
      ON CONFLICT (owner_user_id, pin_key) DO NOTHING
      RETURNING id
    ),
    gone_members AS (
      DELETE FROM vmap_members
      WHERE room_id IN (SELECT id FROM claim)
        AND (SELECT COUNT(*) FROM inserted) >= 0
      RETURNING id
    ),
    gone_messages AS (
      DELETE FROM vmap_messages
      WHERE room_id IN (SELECT id FROM claim)
        AND (SELECT COUNT(*) FROM gone_members) >= 0
      RETURNING id
    )
    SELECT COUNT(*)::int AS claimed FROM claim
  `;
  if (Number(claimed[0]?.claimed || 0) < 1) {
    const again = await prisma.vmapRoom.findUnique({ where: { id: roomId } });
    return again ? roomRecord(again) : null;
  }
  return { title: "V-Map", body, reason, farewell: reason === "arrived" ? FAREWELL : "" };
}

/** 자동차 길찾기. 좌표는 경도,위도. */
locationMapRoutes.get("/guide", requireUserHeader, async (c) => {
  const fromLat = num(c.req.query("fromLat"), NaN);
  const fromLng = num(c.req.query("fromLng"), NaN);
  const toLat = num(c.req.query("toLat"), NaN);
  const toLng = num(c.req.query("toLng"), NaN);
  const mode = String(c.req.query("mode") || "recommend").toLowerCase();
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return c.json({ ok: false, error: "좌표가 없습니다." }, 400);
  }
  try {
    const guided = await fetchKakaoCarDirections(fromLng, fromLat, toLng, toLat, { mode });
    if (!guided.ok) return c.json({ ok: false, error: guided.error }, 200);
    return c.json(guided);
  } catch {
    return c.json({ ok: false, error: "길안내 서버에 연결하지 못했습니다." }, 200);
  }
});

/** 웹/앱 지도 SDK용 — Client ID·Maps 키만 공개 (Secret 금지). */
locationMapRoutes.get("/map-config", async (c) => {
  const clientId = String(process.env.NAVER_MAP_CLIENT_ID || "").trim();
  const googleMapsApiKey = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  return c.json({
    ok: true,
    provider: clientId ? "naver" : "none",
    clientId: clientId || null,
    googleMapsApiKey: googleMapsApiKey || null
  });
});

/** 지도 하단 스폰서. 없으면 앱이 AdMob으로 대체한다. */
locationMapRoutes.get("/sponsor", async (c) => {
  try {
    const row = await prisma.mapSponsorBanner.findFirst({
      where: activeSponsorWhere(new Date()),
      orderBy: { updatedAt: "desc" }
    });
    if (!row) return c.json({ ok: true, banner: null });
    return c.json({
      ok: true,
      banner: {
        id: row.id,
        title: row.title,
        body: row.body,
        imageUrl: row.imageUrl,
        linkUrl: row.linkUrl
      }
    });
  } catch {
    return c.json({ ok: true, banner: null });
  }
});

locationMapRoutes.post("/presence", requireUserHeader, async (c) => {
  const userId = await me(c);
  const body = await c.req.json().catch(() => ({}));
  const lat = num(body.lat, NaN);
  const lng = num(body.lng, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return c.json({ error: "좌표가 없습니다." }, 400);
  await ensureLocationPresenceOverseasSchema();
  await ensureFamilyRemoteSecuritySchema();
  const geo = await reverseGeocodeGoogle(lat, lng);
  const addressLabel = clip(geo?.addressLabel || body.addressLabel, 240);
  const batteryPct = body.batteryPct == null ? null : Math.max(0, Math.min(100, Math.round(num(body.batteryPct))));
  const overseas = {
    isOverseas: Boolean(geo?.isOverseas),
    countryCode: clip(geo?.countryCode, 8),
    countryName: clip(geo?.countryName, 80),
    cityName: clip(geo?.cityName, 80),
    timeZoneId: clip(geo?.timeZoneId, 64)
  };
  const online = body.online !== false;
  const row = await prisma.locationPresence.upsert({
    where: { userId },
    create: {
      userId,
      displayName: clip(body.displayName, 80),
      lat,
      lng,
      addressLabel,
      batteryPct,
      online,
      ...overseas
    },
    update: {
      displayName: clip(body.displayName, 80),
      lat,
      lng,
      addressLabel,
      batteryPct,
      online,
      ...overseas
    }
  });
  // 마지막 확인 위치 24시간 보존용 미러 필드 (삭제·중단 시에도 유지)
  await prisma.$executeRawUnsafe(
    `UPDATE location_presence
     SET last_lat = $2, last_lng = $3, last_seen_at = now(),
         connection_status = CASE WHEN $4 THEN 'CONNECTED' ELSE connection_status END
     WHERE user_id = $1::uuid`,
    userId,
    lat,
    lng,
    online
  );
  return c.json({
    ok: true,
    presence: {
      ...row,
      is_overseas: row.isOverseas,
      country_name: row.countryName,
      city_name: row.cityName
    }
  });
});

locationMapRoutes.get("/family", requireUserHeader, async (c) => {
  const userId = await me(c);
  void sweepRemoteSecurityHeartbeats(20).catch(() => {});
  const links = await prisma.familyProtectionLink.findMany({
    where: {
      status: "active",
      OR: [{ guardianUserId: userId }, { wardUserId: userId }]
    },
    select: {
      guardianUserId: true,
      wardUserId: true,
      familyRelation: true,
      guardianUser: { select: { id: true, legalName: true, publicHandle: true } },
      wardUser: { select: { id: true, legalName: true, publicHandle: true } }
    }
  });
  const ids = new Set<string>([userId]);
  const names = new Map<string, string>();
  for (const link of links) {
    for (const person of [link.guardianUser, link.wardUser]) {
      ids.add(person.id);
      names.set(person.id, person.legalName || person.publicHandle || "가족");
    }
  }
  const photos = await profilePhotos([...ids]);
  await ensureLocationPresenceOverseasSchema();
  await ensureFamilyRemoteSecuritySchema();
  const rows = await prisma.locationPresence.findMany({ where: { userId: { in: [...ids] } } });
  const byId = new Map(rows.map((row) => [row.userId, row]));
  const lastLocRows = await prisma.$queryRawUnsafe<
    Array<{
      user_id: string;
      last_lat: number | null;
      last_lng: number | null;
      last_seen_at: Date | null;
      connection_status: string;
    }>
  >(
    `SELECT user_id, last_lat, last_lng, last_seen_at, connection_status
     FROM location_presence WHERE user_id = ANY($1::uuid[])`,
    [...ids]
  );
  const lastById = new Map(lastLocRows.map((r) => [r.user_id, r]));
  const members = [];
  for (const id of ids) {
    let row = byId.get(id) || null;
    if (row && row.lat != null && row.lng != null && !row.countryCode) {
      const geo = await reverseGeocodeGoogle(row.lat, row.lng);
      if (geo) {
        row = await prisma.locationPresence.update({
          where: { userId: id },
          data: {
            addressLabel: geo.addressLabel || row.addressLabel,
            isOverseas: geo.isOverseas,
            countryCode: geo.countryCode,
            countryName: geo.countryName,
            cityName: geo.cityName,
            timeZoneId: geo.timeZoneId
          }
        });
        byId.set(id, row);
      }
    }
    const last = lastById.get(id);
    const lastSeenAt = last?.last_seen_at || row?.updatedAt || null;
    const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
    const within24h = lastSeenMs > 0 && Date.now() - lastSeenMs <= LAST_LOCATION_TTL_MS;
    const preservedLat = within24h ? last?.last_lat ?? row?.lat ?? null : row?.lat ?? null;
    const preservedLng = within24h ? last?.last_lng ?? row?.lng ?? null : row?.lng ?? null;
    const connectionStatus = last?.connection_status || "CONNECTED";
    const stale = !row || Date.now() - row.updatedAt.getTime() > 3 * 60 * 1000;
    const dead =
      !row ||
      row.online === false ||
      row.batteryPct === 0 ||
      stale ||
      connectionStatus === "DISCONNECTED" ||
      connectionStatus === "TERMINATED";
    const lastKnownLocation = Boolean(
      dead && within24h && preservedLat != null && preservedLng != null
    );
    members.push({
      userId: id,
      self: id === userId,
      displayName: row?.displayName || names.get(id) || (id === userId ? "나" : "가족"),
      lat: (lastKnownLocation || within24h) ? preservedLat : (row?.lat ?? null),
      lng: (lastKnownLocation || within24h) ? preservedLng : (row?.lng ?? null),
      addressLabel: row?.addressLabel || "",
      batteryPct: row?.batteryPct ?? null,
      online: Boolean(row) && !dead,
      grayscale: dead,
      lastKnownLocation,
      last_lat: within24h ? last?.last_lat ?? null : null,
      last_lng: within24h ? last?.last_lng ?? null : null,
      last_seen_at: within24h && lastSeenAt ? new Date(lastSeenAt).toISOString() : null,
      connectionStatus,
      photoUrl: photos.get(id) || "",
      updatedAt: row?.updatedAt?.toISOString() || null,
      isOverseas: Boolean(row?.isOverseas),
      is_overseas: Boolean(row?.isOverseas),
      countryCode: row?.countryCode || "",
      countryName: row?.countryName || "",
      country_name: row?.countryName || "",
      cityName: row?.cityName || "",
      city_name: row?.cityName || "",
      timeZoneId: row?.timeZoneId || ""
    });
  }
  const enriched = await attachLastKnownLocationFields(members);
  return c.json({ ok: true, members: enriched });
});

locationMapRoutes.post("/vmap", requireUserHeader, async (c) => {
  const userId = await me(c);
  const body = await c.req.json().catch(() => ({}));
  const placeLat = num(body.placeLat, NaN);
  const placeLng = num(body.placeLng, NaN);
  if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return c.json({ error: "약속 장소가 없습니다." }, 400);
  const room = await prisma.vmapRoom.create({
    data: {
      hostUserId: userId,
      title: clip(body.title, 80) || "약속",
      placeLabel: "",
      placeLat,
      placeLng,
      placeReady: false
    }
  });
  await prisma.vmapMember.create({
    data: { roomId: room.id, userId, displayName: clip(body.displayName, 80) || "나", departed: false }
  });
  return c.json({ ok: true, room });
});

locationMapRoutes.get("/place-search", requireUserHeader, async (c) => {
  const query = clip(c.req.query("q"), 80);
  if (query.length < 2) return c.json({ ok: true, places: [] });
  const list = await searchKakaoLocalList(query, 6).catch(() => []);
  return c.json({
    ok: true,
    places: list
      .filter((item) => item.latitude != null && item.longitude != null)
      .map((item) => ({
        label: item.place_name,
        address: item.road_address || item.address,
        lat: item.latitude,
        lng: item.longitude
      }))
  });
});

locationMapRoutes.patch("/vmap/:id/place", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const room = await prisma.vmapRoom.findFirst({ where: { id: roomId, active: true } });
  if (!room) return c.json({ error: "약속을 찾을 수 없습니다." }, 404);
  if (room.hostUserId !== userId) return c.json({ error: "도착지는 방장만 정할 수 있습니다." }, 403);
  const body = await c.req.json().catch(() => ({}));
  const placeLat = num(body.placeLat, NaN);
  const placeLng = num(body.placeLng, NaN);
  if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return c.json({ error: "핀 위치가 없습니다." }, 400);
  const updated = await prisma.vmapRoom.update({
    where: { id: roomId },
    data: {
      placeLat,
      placeLng,
      placeLabel: clip(body.placeLabel, 160) || "도착지",
      placeReady: true
    }
  });
  return c.json({ ok: true, room: updated });
});

locationMapRoutes.post("/vmap/:id/join", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const room = await prisma.vmapRoom.findFirst({ where: { id: roomId, active: true } });
  if (!room) return c.json({ error: "약속을 찾을 수 없습니다." }, 404);
  const body = await c.req.json().catch(() => ({}));
  await prisma.vmapMember.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, displayName: clip(body.displayName, 80) || "참여자", departed: false },
    update: { displayName: clip(body.displayName, 80) || "참여자" }
  });
  return c.json({ ok: true, room });
});

/**
 * V-Map 초대 가능 여부 — 나와 친구의 country_code가 같을 때만 is_eligible.
 * 위치·국가 상세는 응답에 넣지 않는다.
 */
locationMapRoutes.post("/vmap/eligible-friends", requireUserHeader, async (c) => {
  const userId = await me(c);
  const body = (await c.req.json().catch(() => ({}))) as { userIds?: unknown };
  const rawIds = Array.isArray(body.userIds) ? body.userIds : [];
  const userIds: string[] = [
    ...new Set(
      rawIds
        .map((id) => String(id || "").trim())
        .filter((id): id is string => Boolean(id) && id !== userId && /^[0-9a-f-]{36}$/i.test(id))
    )
  ].slice(0, 120);

  await ensureLocationPresenceOverseasSchema();
  const mine = await prisma.locationPresence.findUnique({
    where: { userId },
    select: { countryCode: true }
  });
  const myCode = String(mine?.countryCode || "").trim().toUpperCase();
  if (!userIds.length || !myCode) {
    return c.json({
      ok: true,
      friends: userIds.map((id) => ({ userId: id, is_eligible: false }))
    });
  }

  const peers = await prisma.locationPresence.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, countryCode: true }
  });
  const codeById = new Map(
    peers.map((row) => [row.userId, String(row.countryCode || "").trim().toUpperCase()])
  );
  return c.json({
    ok: true,
    friends: userIds.map((id) => ({
      userId: id,
      is_eligible: Boolean(codeById.get(id)) && codeById.get(id) === myCode
    }))
  });
});

/** VLUE 수락 친구 목록 (V-Map 초대 피커) */
locationMapRoutes.get("/friends", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = clip(c.req.query("roomId"), 80);
  const friendRows = await prisma.friendRequest.findMany({
    where: {
      status: "accepted",
      OR: [{ fromUserId: userId }, { toUserId: userId }]
    },
    select: { fromUserId: true, toUserId: true },
    take: 400
  });
  const peerIds = [
    ...new Set(
      friendRows
        .map((row) => (row.fromUserId === userId ? row.toUserId : row.fromUserId))
        .filter((id) => id && id !== userId)
    )
  ].slice(0, 100);

  let inRoom = new Set<string>();
  if (roomId) {
    const members = await prisma.vmapMember.findMany({
      where: { roomId },
      select: { userId: true }
    });
    inRoom = new Set(members.map((m) => m.userId));
  }

  if (!peerIds.length) return c.json({ ok: true, friends: [] });

  const users = await prisma.user.findMany({
    where: { id: { in: peerIds } },
    select: { id: true, legalName: true, publicHandle: true }
  });
  const photos = await profilePhotos(peerIds);
  const friends = users
    .map((user) => ({
      userId: user.id,
      displayName: String(user.legalName || user.publicHandle || "친구").replace(/^@+/, "").trim() || "친구",
      publicHandle: String(user.publicHandle || "").replace(/^@+/, "").trim(),
      photoUrl: photos.get(user.id) || "",
      inRoom: inRoom.has(user.id)
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
  return c.json({ ok: true, friends });
});

/** V-Map 친구 초대 — 알림함 + SSE + FCM */
locationMapRoutes.post("/vmap/:id/invite", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const room = await prisma.vmapRoom.findFirst({ where: { id: roomId, active: true } });
  if (!room) return c.json({ error: "약속을 찾을 수 없습니다." }, 404);

  const member = await prisma.vmapMember.findUnique({
    where: { roomId_userId: { roomId, userId } }
  });
  if (!member && room.hostUserId !== userId) {
    return c.json({ error: "방에 참여한 회원만 초대할 수 있습니다." }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const rawIds = Array.isArray(body.userIds) ? body.userIds : [];
  const cleanedIds: string[] = [];
  for (const raw of rawIds) {
    const id = String(raw ?? "").trim();
    if (id && id !== userId) cleanedIds.push(id);
  }
  const targetIds = [...new Set(cleanedIds)].slice(0, 30);
  if (!targetIds.length) return c.json({ error: "초대할 친구를 선택해 주세요." }, 400);

  const friendRows = await prisma.friendRequest.findMany({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: userId, toUserId: { in: targetIds } },
        { toUserId: userId, fromUserId: { in: targetIds } }
      ]
    },
    select: { fromUserId: true, toUserId: true }
  });
  const friendSet = new Set<string>(
    friendRows.map((row) => (row.fromUserId === userId ? row.toUserId : row.fromUserId))
  );
  const invitees: string[] = targetIds.filter((id) => friendSet.has(id));
  if (!invitees.length) return c.json({ error: "VLUE 친구만 초대할 수 있습니다." }, 400);

  const host = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, publicHandle: true }
  });
  const hostName =
    String(host?.legalName || host?.publicHandle || "친구").replace(/^@+/, "").trim() || "친구";
  const place = room.placeLabel || room.title || "약속";
  const title = "V-Map 초대";
  const noticeBody = `${hostName}님이 V-Map 약속에 초대했습니다. · ${place}`;

  let invited = 0;
  for (const inviteeId of invitees) {
    const pinKey = `vmap-inv:${roomId}`;
    let notificationId = "";
    try {
      const row = await prisma.ownerNotification.upsert({
        where: { ownerUserId_pinKey: { ownerUserId: inviteeId, pinKey } },
        create: {
          ownerUserId: inviteeId,
          actorUserId: userId,
          title,
          body: noticeBody,
          pinKey,
          payloadJson: {
            type: "vlue-vmap-invite",
            roomId,
            actorUserId: userId,
            actorName: hostName,
            placeLabel: place
          }
        },
        update: {
          actorUserId: userId,
          title,
          body: noticeBody,
          status: "unread",
          payloadJson: {
            type: "vlue-vmap-invite",
            roomId,
            actorUserId: userId,
            actorName: hostName,
            placeLabel: place
          }
        }
      });
      notificationId = row.id;
    } catch (err) {
      console.warn("[vmap] invite notification_failed", err);
      continue;
    }

    const payload = {
      type: "vlue-vmap-invite",
      title,
      body: noticeBody,
      message: noticeBody,
      roomId,
      actorUserId: userId,
      actorName: hostName,
      placeLabel: place,
      notificationId,
      at: new Date().toISOString()
    };
    try {
      ssePublish(inviteeId, payload);
    } catch (err) {
      console.warn("[vmap] invite sse_failed", err);
    }
    void sendShowcaseSocialPushToUser(inviteeId, title, noticeBody, {
      type: "vlue-vmap-invite",
      roomId,
      actorUserId: userId,
      actorName: hostName,
      placeLabel: place,
      notificationId
    }).catch((err) => {
      console.warn("[vmap] invite fcm_failed", err);
    });
    invited += 1;
  }

  return c.json({ ok: true, invited, skipped: targetIds.length - invited });
});

locationMapRoutes.post("/vmap/:id/depart", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const body = await c.req.json().catch(() => ({}));
  const lat = num(body.lat, NaN);
  const lng = num(body.lng, NaN);
  const member = await prisma.vmapMember.update({
    where: { roomId_userId: { roomId, userId } },
    data: {
      departed: true,
      online: body.online !== false,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      batteryPct: body.batteryPct == null ? undefined : Math.round(num(body.batteryPct))
    }
  });
  const room = await maybeBeginArrival(roomId);
  return c.json({ ok: true, member, closingAt: room?.closingAt?.toISOString() || null });
});

locationMapRoutes.post("/vmap/:id/arrive", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const current = await prisma.vmapMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!current?.departed) return c.json({ error: "출발한 뒤에 도착할 수 있습니다." }, 400);
  const member = await prisma.vmapMember.update({
    where: { roomId_userId: { roomId, userId } },
    data: { arrived: true, online: true }
  });
  const room = await maybeBeginArrival(roomId);
  return c.json({ ok: true, member, closingAt: room?.closingAt?.toISOString() || null });
});

locationMapRoutes.post("/vmap/:id/presence", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const current = await prisma.vmapMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!current?.departed) return c.json({ ok: true, hidden: true });
  const body = await c.req.json().catch(() => ({}));
  const lat = num(body.lat, NaN);
  const lng = num(body.lng, NaN);
  const nextLat = Number.isFinite(lat) ? lat : current.lat;
  const nextLng = Number.isFinite(lng) ? lng : current.lng;
  let arrived = current.arrived;
  if (!arrived && nextLat != null && nextLng != null) {
    const place = await prisma.vmapRoom.findFirst({
      where: { id: roomId, active: true, placeReady: true },
      select: { placeLat: true, placeLng: true }
    });
    if (place && haversineMeters(nextLat, nextLng, place.placeLat, place.placeLng) <= AUTO_ARRIVE_METERS) {
      arrived = true;
    }
  }
  const member = await prisma.vmapMember.update({
    where: { roomId_userId: { roomId, userId } },
    data: {
      arrived,
      online: body.online !== false,
      lat: nextLat,
      lng: nextLng,
      batteryPct: body.batteryPct == null ? current.batteryPct : Math.round(num(body.batteryPct))
    }
  });
  const room = await maybeBeginArrival(roomId);
  return c.json({ ok: true, member, closingAt: room?.closingAt?.toISOString() || null });
});

locationMapRoutes.get("/vmap/:id", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  let room = await prisma.vmapRoom.findUnique({ where: { id: roomId } });
  if (!room) return c.json({ error: "종료된 약속입니다." }, 404);
  if (!room.active) {
    return c.json({ ok: true, dissolved: true, ...roomRecord(room) });
  }
  if (room.closingAt && Date.now() - room.closingAt.getTime() >= 5000) {
    const record = (await closeVmapRoom(roomId, "arrived")) || {
      title: "V-Map",
      body: "",
      reason: "arrived" as const,
      farewell: FAREWELL
    };
    return c.json({ ok: true, dissolved: true, ...record });
  }
  if (!room.closingAt) room = (await maybeBeginArrival(roomId)) || room;
  const mine = await prisma.vmapMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!mine) return c.json({ error: "방에 참여하지 않았습니다." }, 403);
  const members = await prisma.vmapMember.findMany({ where: { roomId } });
  const photos = await profilePhotos(members.map((member) => member.userId));
  return c.json({
    ok: true,
    room,
    members: members.map((member) => ({
      ...member,
      lat: member.departed ? member.lat : null,
      lng: member.departed ? member.lng : null,
      arrived: member.arrived,
      dropout: isVmapDropout(member),
      photoUrl: photos.get(member.userId) || "",
      batteryPct: member.batteryPct,
      addressLabel: ""
    }))
  });
});

locationMapRoutes.post("/vmap/:id/messages", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const mine = await prisma.vmapMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!mine) return c.json({ error: "방에 참여하지 않았습니다." }, 403);
  const body = await c.req.json().catch(() => ({}));
  const kind = body.kind === "voice" ? "voice" : "text";
  const text = String(body.body || "");
  if (!text.trim()) return c.json({ error: "내용이 없습니다." }, 400);
  if (text.length > 180_000) return c.json({ error: "음성 메시지가 너무 깁니다." }, 413);
  const message = await prisma.vmapMessage.create({
    data: {
      roomId,
      userId,
      displayName: mine.displayName || "참여자",
      kind,
      body: text
    }
  });
  /* 방 유지 중에는 대화 유지. 방 종료(closeVmapRoom) 시 전체 삭제. */
  const peers = await prisma.vmapMember.findMany({
    where: { roomId, NOT: { userId } },
    select: { userId: true }
  });
  void notifyLocationChat({
    recipientIds: peers.map((p) => p.userId),
    actorUserId: userId,
    actorName: mine.displayName || "참여자",
    title: "V-Map 채팅",
    body: kind === "voice" ? "음성 메시지" : text,
    mode: "vmap",
    roomId
  });
  const badges = await cyanBadgeByUserIds([userId]);
  return c.json({
    ok: true,
    message: {
      ...message,
      createdAt: message.createdAt.toISOString(),
      cyanBadgeActive: badges.get(userId) === true
    }
  });
});

locationMapRoutes.get("/vmap/:id/messages", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const mine = await prisma.vmapMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!mine) return c.json({ error: "방에 참여하지 않았습니다." }, 403);
  const after = String(c.req.query("after") || "");
  const rows = await prisma.vmapMessage.findMany({
    where: { roomId, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 40
  });
  const badges = await cyanBadgeByUserIds(rows.map((row) => row.userId));
  return c.json({
    ok: true,
    messages: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      cyanBadgeActive: badges.get(row.userId) === true
    }))
  });
});

/** 가족 위치방 채팅 — 30일 보관 */
locationMapRoutes.get("/family/messages", requireUserHeader, async (c) => {
  const userId = await me(c);
  const circle = await familyCircleUserIds(userId);
  const after = String(c.req.query("after") || "");
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.locationFamilyMessage.findMany({
    where: {
      userId: { in: circle },
      createdAt: { gte: cutoff, ...(after ? { gt: new Date(after) } : {}) }
    },
    orderBy: { createdAt: "asc" },
    take: 40
  });
  const badges = await cyanBadgeByUserIds(rows.map((row) => row.userId));
  return c.json({
    ok: true,
    messages: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      cyanBadgeActive: badges.get(row.userId) === true
    }))
  });
});

/** 가족 위치 → 상대 위치로 이동 시작 (채팅 + 푸시/알림함) */
locationMapRoutes.post("/family/navigate", requireUserHeader, async (c) => {
  const userId = await me(c);
  const body = await c.req.json().catch(() => ({}));
  const targetUserId = String(body.targetUserId || "").trim();
  if (!targetUserId || targetUserId === userId) {
    return c.json({ error: "이동할 가족을 선택해 주세요." }, 400);
  }
  const circle = await familyCircleUserIds(userId);
  if (!circle.includes(targetUserId)) {
    return c.json({ error: "가족으로 연결된 회원만 이동할 수 있습니다." }, 403);
  }
  const users = await prisma.user.findMany({
    where: { id: { in: [userId, targetUserId] } },
    select: { id: true, legalName: true, publicHandle: true }
  });
  const nameOf = (id: string, fallback: string) => {
    const row = users.find((u) => u.id === id);
    return String(row?.legalName || row?.publicHandle || fallback).replace(/^@+/, "").trim() || fallback;
  };
  const actorName = clip(body.displayName, 80) || nameOf(userId, "회원");
  const targetName = clip(body.targetDisplayName, 80) || nameOf(targetUserId, "가족");
  const line = `${actorName}님께서 (${targetName})님 계신곳으로 출발하셨습니다.`;
  const message = await prisma.locationFamilyMessage.create({
    data: {
      userId,
      displayName: "V-MAP",
      kind: "system",
      body: line
    }
  });
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.locationFamilyMessage.deleteMany({
    where: { userId: { in: circle }, createdAt: { lt: cutoff } }
  });
  void notifyLocationChat({
    recipientIds: [targetUserId],
    actorUserId: userId,
    actorName,
    title: "가족 위치",
    body: line,
    mode: "family",
    noticeBody: line
  });
  return c.json({
    ok: true,
    line,
    message: {
      ...message,
      createdAt: message.createdAt.toISOString(),
      cyanBadgeActive: false
    }
  });
});

locationMapRoutes.post("/family/messages", requireUserHeader, async (c) => {
  const userId = await me(c);
  const circle = await familyCircleUserIds(userId);
  if (circle.length < 2) return c.json({ error: "연결된 가족이 없습니다." }, 400);
  const body = await c.req.json().catch(() => ({}));
  const kind = body.kind === "voice" ? "voice" : "text";
  const text = String(body.body || "");
  if (!text.trim()) return c.json({ error: "내용이 없습니다." }, 400);
  if (text.length > 180_000) return c.json({ error: "음성 메시지가 너무 깁니다." }, 413);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, publicHandle: true }
  });
  const displayName =
    clip(body.displayName, 80) ||
    String(user?.legalName || user?.publicHandle || "나").replace(/^@+/, "").trim() ||
    "나";
  const message = await prisma.locationFamilyMessage.create({
    data: { userId, displayName, kind, body: text }
  });
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.locationFamilyMessage.deleteMany({
    where: { userId: { in: circle }, createdAt: { lt: cutoff } }
  });
  void notifyLocationChat({
    recipientIds: circle,
    actorUserId: userId,
    actorName: displayName,
    title: "가족 위치 채팅",
    body: kind === "voice" ? "음성 메시지" : text,
    mode: "family"
  });
  const badges = await cyanBadgeByUserIds([userId]);
  return c.json({
    ok: true,
    message: {
      ...message,
      createdAt: message.createdAt.toISOString(),
      cyanBadgeActive: badges.get(userId) === true
    }
  });
});

/** 가족 채팅 30일 TTL 크론 */
locationMapRoutes.post("/cron/purge-family-chat", async (c) => {
  const secret = c.req.header("X-Family-Cron-Secret") || "";
  const expected = process.env.FAMILY_CRON_SECRET || "";
  if (!expected || secret !== expected) return c.json({ error: "unauthorized" }, 401);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.locationFamilyMessage.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });
  return c.json({ ok: true, deleted: result.count, cutoff: cutoff.toISOString() });
});

locationMapRoutes.post("/vmap/:id/exit", requireUserHeader, async (c) => {
  const userId = await me(c);
  const roomId = paramId(c);
  const room = await prisma.vmapRoom.findUnique({ where: { id: roomId } });
  if (!room) return c.json({ ok: true, closed: false, missing: true });
  if (!room.active) return c.json({ ok: true, closed: true, already: true });
  if (room.hostUserId === userId) {
    const pending = arrivalTimers.get(roomId);
    if (pending) {
      clearTimeout(pending);
      arrivalTimers.delete(roomId);
    }
    const record = await closeVmapRoom(roomId, room.closingReason === "arrived" ? "arrived" : "host");
    return c.json({ ok: true, closed: true, record });
  }
  const mine = await prisma.vmapMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!mine) return c.json({ ok: true, closed: false, left: true });
  const leaveName = String(mine.displayName || "참여자").trim() || "참여자";
  await prisma.vmapMessage.create({
    data: {
      roomId,
      userId,
      displayName: "시스템",
      kind: "system",
      body: `${leaveName}님이 방을 나가셨습니다.`
    }
  });
  await prisma.vmapMember.deleteMany({ where: { roomId, userId } });
  return c.json({ ok: true, closed: false, left: true, displayName: leaveName });
});

locationMapRoutes.post("/vmap/:id/finish", requireUserHeader, async (c) => {
  const roomId = paramId(c);
  const room = await prisma.vmapRoom.findUnique({ where: { id: roomId } });
  if (!room) return c.json({ ok: true, dissolved: true });
  if (!room.active) return c.json({ ok: true, dissolved: true, ...roomRecord(room) });
  if (!room.closingAt || Date.now() - room.closingAt.getTime() < 5000) {
    return c.json({ ok: true, waiting: true, closingAt: room.closingAt?.toISOString() || null });
  }
  const record = (await closeVmapRoom(roomId, "arrived")) || {
    title: "V-Map",
    body: "",
    reason: "arrived" as const,
    farewell: FAREWELL
  };
  return c.json({ ok: true, dissolved: true, ...record });
});
