import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

export async function recordContactSyncConsent() {
  const res = await vlueAuthFetch(apiUrl("/api/contacts/consent"), { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `동의 기록 실패 (${res.status})`);
  }
  return res.json();
}

/** @param {{ name?: string, phone?: string }[]} contacts */
export async function matchContactsWithVlue(contacts) {
  const res = await vlueAuthFetch(apiUrl("/api/contacts/match"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacts })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `연락처 매칭 실패 (${res.status})`);
  return data;
}

export async function sendContactFriendRequest(toUserId, message) {
  const res = await vlueAuthFetch(apiUrl("/api/contacts/friend-request"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toUserId, message })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "already_friend" || data.error === "already_pending") {
      return { ok: false, reason: data.error, id: data.id };
    }
    throw new Error(data.error || `친구 신청 실패 (${res.status})`);
  }
  return { ok: true, ...data };
}
