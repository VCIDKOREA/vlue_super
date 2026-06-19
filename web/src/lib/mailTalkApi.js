import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

export async function fetchMailTalkRooms() {
  const res = await vlueAuthFetch(apiUrl("/api/mail-talk/rooms"), {
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "메일톡 목록을 불러오지 못했습니다.");
  }
  return data.rooms || [];
}

export async function fetchMailTalkMessages(roomId) {
  const res = await vlueAuthFetch(apiUrl(`/api/mail-talk/rooms/${encodeURIComponent(roomId)}/messages`), {
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "메시지를 불러오지 못했습니다.");
  }
  return { room: data.room, messages: data.messages || [] };
}

export async function sendMailTalkMessage(roomId, { chatBody, subject, attachmentUrls }) {
  const res = await vlueAuthFetch(apiUrl(`/api/mail-talk/rooms/${encodeURIComponent(roomId)}/send`), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ chatBody, subject, attachmentUrls })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "메일 발송에 실패했습니다.");
  }
  return data;
}

export async function sendMailTalkNew({ counterpartyEmail, chatBody, subject, attachmentUrls }) {
  const res = await vlueAuthFetch(apiUrl("/api/mail-talk/send"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ counterpartyEmail, chatBody, subject, attachmentUrls })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "메일 발송에 실패했습니다.");
  }
  return data;
}

export const MAIL_TALK_ROOM_PREFIX = "mailtalk:";

export function isMailTalkRoomId(roomId) {
  return String(roomId || "").startsWith(MAIL_TALK_ROOM_PREFIX);
}

export function mailTalkRoomIdFromNav(roomId) {
  return String(roomId || "").slice(MAIL_TALK_ROOM_PREFIX.length);
}

export function mailTalkNavRoomId(roomUuid) {
  return `${MAIL_TALK_ROOM_PREFIX}${roomUuid}`;
}

export function formatMailTalkTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
    }
    return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  } catch {
    return "";
  }
}

export function counterpartyInitial(email) {
  const local = String(email || "").split("@")[0] || "?";
  return local.slice(0, 1).toUpperCase();
}
