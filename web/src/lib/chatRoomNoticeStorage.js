/**
 * 채팅방 공지 (일정 공유 등) — 방당 1개 활성 공지 + 읽음 표시
 */

const NOTICES_KEY = "vlue_chat_room_notices_v1";
const READS_KEY = "vlue_chat_room_notice_reads_v1";

export const CHAT_ROOM_NOTICE_CHANGED = "vlue-chat-room-notice-changed";

function readNoticesMap() {
  try {
    const raw = localStorage.getItem(NOTICES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeNoticesMap(map) {
  try {
    localStorage.setItem(NOTICES_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(CHAT_ROOM_NOTICE_CHANGED));
  } catch {
    /* ignore */
  }
}

function readReadsMap() {
  try {
    const raw = localStorage.getItem(READS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeReadsMap(map) {
  try {
    localStorage.setItem(READS_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(CHAT_ROOM_NOTICE_CHANGED));
  } catch {
    /* ignore */
  }
}

export function getRoomNotice(roomId) {
  const id = String(roomId || "").trim();
  if (!id) return null;
  return readNoticesMap()[id] || null;
}

export function setRoomNotice(roomId, notice) {
  const id = String(roomId || "").trim();
  if (!id) return null;
  const map = readNoticesMap();
  map[id] = notice;
  writeNoticesMap(map);
  return notice;
}

export function clearRoomNotice(roomId) {
  const id = String(roomId || "").trim();
  if (!id) return;
  const map = readNoticesMap();
  delete map[id];
  writeNoticesMap(map);
}

export function getNoticeReadMap(noticeId) {
  return readReadsMap()[noticeId] || {};
}

export function markNoticeRead(noticeId, userId) {
  const nid = String(noticeId || "").trim();
  const uid = String(userId || "").trim();
  if (!nid || !uid) return;
  const all = readReadsMap();
  const prev = all[nid] || {};
  all[nid] = { ...prev, [uid]: new Date().toISOString() };
  writeReadsMap(all);
}

export function getNoticeReadStats(notice, myUserId) {
  const audience = (notice?.audienceUserIds || []).filter((uid) => uid !== notice?.authorUserId);
  const reads = getNoticeReadMap(notice?.id);
  const readCount = audience.filter((uid) => reads[uid]).length;
  const unreadCount = Math.max(0, audience.length - readCount);
  const iRead = Boolean(reads[myUserId]);
  const isGroup = audience.length > 1 || notice?.isGroupRoom;
  return { readCount, unreadCount, total: audience.length, iRead, isGroup };
}

/** 데모: 방 ID 기준 수신자 (본인 제외) */
export function defaultAudienceForRoom(roomId, authorUserId) {
  const me = String(authorUserId || "me");
  const peers = [`peer-${roomId}`, "demo-peer", "demo-family-mom", "demo-family-brother"].filter(
    (p) => p !== me
  );
  const isGroup = !roomId.includes(":") || roomId.startsWith("subscribe:");
  if (isGroup) {
    return [me, ...peers.slice(0, 5)];
  }
  return [me, peers[0] || "demo-peer"];
}

export function buildCalendarNoticePayload({ roomId, event, authorUserId, authorName, roomName }) {
  const audienceUserIds = defaultAudienceForRoom(roomId, authorUserId);
  const when = new Date(event.startAt).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return {
    id: `rn-${Date.now()}`,
    roomId,
    kind: "calendar",
    eventId: event.id,
    title: event.title,
    body: event.content || "",
    location: event.location || "",
    startAt: event.startAt,
    endAt: event.endAt,
    whenLabel: when,
    authorUserId,
    authorName: authorName || "회원",
    roomName: roomName || roomId,
    isGroupRoom: audienceUserIds.length > 2,
    audienceUserIds,
    createdAt: new Date().toISOString()
  };
}
