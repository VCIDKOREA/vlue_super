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
    /* 이미 대기 중이면 보낸요청에 보이도록 성공으로 취급 */
    if (data.error === "already_pending") {
      return { ok: true, alreadyPending: true, id: data.id, status: "pending" };
    }
    if (data.error === "already_friend") {
      return { ok: false, reason: data.error, id: data.id };
    }
    throw new Error(data.error || `친구 신청 실패 (${res.status})`);
  }
  return { ok: true, ...data };
}

/** 보낸/받은 친구 신청 (pending) */
export async function fetchContactFriendRequests() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/contacts/friend-requests"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, sent: [], received: [], error: data.error };
    return {
      ok: true,
      sent: Array.isArray(data.sent) ? data.sent : [],
      received: Array.isArray(data.received) ? data.received : []
    };
  } catch (e) {
    return { ok: false, sent: [], received: [], error: e?.message || "network" };
  }
}

/** @param {"accept"|"reject"} action */
export async function respondContactFriendRequest(requestId, action) {
  const id = String(requestId || "").trim();
  if (!id) throw new Error("requestId required");
  const path =
    action === "reject"
      ? `/api/contacts/friend-requests/${encodeURIComponent(id)}/reject`
      : `/api/contacts/friend-requests/${encodeURIComponent(id)}/accept`;
  const res = await vlueAuthFetch(apiUrl(path), { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `친구 요청 처리 실패 (${res.status})`);
  }
  return { ok: true, ...data };
}
