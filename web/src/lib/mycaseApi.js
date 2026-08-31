import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

/**
 * @typedef {Object} MycasePolicy
 * @property {'free'|'pro'} tier
 * @property {number} maxMainSlots
 * @property {number} usedMainSlots
 * @property {number} remainingSlots
 * @property {string|null} nextChangeAt
 * @property {number} cooldownRemainingMs
 * @property {boolean} canChangeBroadcast
 * @property {string|null} mainBroadcastChangedAt
 */

/**
 * @typedef {Object} MycaseGridItem
 * @property {string} id
 * @property {string} ownerUserId
 * @property {string} title
 * @property {string|null} thumbnailUrl
 * @property {boolean} isPublic
 * @property {boolean} isMainBroadcast
 * @property {number|null} slotIndex
 * @property {string} createdAt
 * @property {string} updatedAt
 */

function errPayload(data, fallback) {
  return {
    ok: false,
    error: data?.error || fallback,
    message: data?.message || data?.error || fallback,
    details: data?.details || null,
    policy: data?.policy || null
  };
}

function networkFail(e, fallback = "network") {
  const raw = String(e?.message || "").trim();
  const isFetchFail = /failed to fetch|networkerror|load failed|network/i.test(raw);
  return {
    ok: false,
    error: "network",
    message: isFetchFail
      ? "서버에 연결하지 못했습니다. 로컬 API(8788) 실행 여부와 DB 마이그레이션을 확인해 주세요."
      : raw || fallback
  };
}

export async function fetchMycasePolicy() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/mycase/policy"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "policy_failed");
    return { ok: true, policy: data.policy };
  } catch (e) {
    return networkFail(e);
  }
}

/** 메인 송출 라이브 케이스 (통화·홈 미리보기 동기화) */
export async function fetchMycaseLiveBroadcast() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/mycase/live"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "live_failed");
    return {
      ok: true,
      item: data.item || null,
      items: data.items || [],
      policy: data.policy || null
    };
  } catch (e) {
    return networkFail(e);
  }
}

/** @param {{ limit?: number, cursor?: string }} [opts] */
export async function fetchMyMycaseList(opts = {}) {
  try {
    const q = new URLSearchParams();
    if (opts.limit) q.set("limit", String(opts.limit));
    if (opts.cursor) q.set("cursor", opts.cursor);
    const res = await vlueAuthFetch(apiUrl(`/api/mycase/me?${q}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "list_failed");
    return {
      ok: true,
      items: data.items || [],
      nextCursor: data.nextCursor || null,
      policy: data.policy
    };
  } catch (e) {
    return networkFail(e);
  }
}

/** @param {string} userId @param {{ limit?: number, cursor?: string }} [opts] */
export async function fetchUserMycase(userId, opts = {}) {
  try {
    const q = new URLSearchParams();
    if (opts.limit) q.set("limit", String(opts.limit));
    if (opts.cursor) q.set("cursor", opts.cursor);
    const res = await vlueAuthFetch(
      apiUrl(`/api/mycase/user/${encodeURIComponent(userId)}?${q}`)
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "list_failed");
    return data;
  } catch (e) {
    return networkFail(e);
  }
}

/** @param {string} caseId */
export async function fetchMycaseDetail(caseId) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/mycase/${encodeURIComponent(caseId)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "detail_failed");
    return { ok: true, item: data.item, isOwner: data.isOwner };
  } catch (e) {
    return networkFail(e);
  }
}

/**
 * 새 아카이브 게시물 (누적 저장 — 덮어쓰기 없음)
 * @param {{ title: string, thumbnailUrl?: string|null, payloadJson?: object, isPublic?: boolean, isMainBroadcast?: boolean }} body
 */
export async function createMycase(body) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/mycase"), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "create_failed");
    return { ok: true, item: data.item, policy: data.policy };
  } catch (e) {
    return networkFail(e);
  }
}

/**
 * 쇼케이스 수정/등록 시 기존 데이터 유실 없이 아카이브로 누적
 * @param {{ title: string, thumbnailUrl?: string|null, payloadJson?: object, isPublic?: boolean, supersedesCaseId?: string|null, promoteToMain?: boolean }} body
 */
export async function archiveShowcaseToMycase(body) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/mycase/archive"), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "archive_failed");
    return { ok: true, item: data.item, policy: data.policy || null };
  } catch (e) {
    return networkFail(e);
  }
}

/** @param {string} caseId @param {boolean} enabled */
export async function setMycaseBroadcast(caseId, enabled) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/mycase/${encodeURIComponent(caseId)}/broadcast`), {
      method: "PUT",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ enabled })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "broadcast_failed");
    return { ok: true, item: data.item, policy: data.policy };
  } catch (e) {
    return networkFail(e);
  }
}

/** @param {string} caseId @param {{ title?: string, thumbnailUrl?: string|null, payloadJson?: object, isPublic?: boolean }} body */
export async function patchMycase(caseId, body = {}) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/mycase/${encodeURIComponent(caseId)}`), {
      method: "PATCH",
      headers: vlueAuthHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "update_failed");
    return { ok: true, item: data.item };
  } catch (e) {
    return networkFail(e);
  }
}

/** @param {string} caseId */
export async function deleteMycase(caseId) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/mycase/${encodeURIComponent(caseId)}`), {
      method: "DELETE",
      headers: vlueAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return errPayload(data, "delete_failed");
    return { ok: true, policy: data.policy };
  } catch (e) {
    return networkFail(e);
  }
}

/** @param {MycasePolicy|null|undefined} policy */
export function formatCooldownHint(policy) {
  if (!policy || policy.tier !== "free") return "";
  if (policy.canChangeBroadcast) {
    return `송출중 ${policy.usedMainSlots}/${policy.maxMainSlots} · 변경 가능`;
  }
  const days = Math.max(1, Math.ceil((policy.cooldownRemainingMs || 0) / (24 * 60 * 60 * 1000)));
  return `송출중 ${policy.usedMainSlots}/${policy.maxMainSlots} · ${days}일 후 변경 가능`;
}
