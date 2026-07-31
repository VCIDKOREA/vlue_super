import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

/**
 * @typedef {'none'|'following'|'followed_by'|'mutual'|'pending_out'|'pending_in'} FollowRelation
 */

/**
 * @typedef {Object} FollowState
 * @property {FollowRelation} relation
 * @property {string} label
 * @property {boolean} isFollowing
 * @property {boolean} isFollowedBy
 * @property {boolean} isMutual
 * @property {boolean} isPendingOut
 * @property {boolean} isPendingIn
 * @property {string|null} followId
 * @property {string|null} incomingFollowId
 * @property {{ followers: number, following: number }} counts
 * @property {{ userId: string, isPrivateFollow: boolean }} target
 */

/** @param {string} targetUserId */
export async function fetchFollowState(targetUserId) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/follow/state/${encodeURIComponent(targetUserId)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, state: null, error: data.error || "fetch_failed" };
    return { ok: true, state: data.state };
  } catch (e) {
    return { ok: false, state: null, error: e?.message || "network" };
  }
}

/** @param {string} targetUserId */
export async function toggleFollow(targetUserId) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/follow/toggle"), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || "toggle_failed",
        state: data.state || null,
        status: res.status
      };
    }
    return { ok: true, action: data.action, state: data.state, follow: data.follow };
  } catch (e) {
    return { ok: false, error: e?.message || "network", state: null };
  }
}

/** @param {string} followId */
export async function acceptFollowRequest(followId) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/follow/requests/${encodeURIComponent(followId)}/accept`), {
      method: "POST",
      headers: vlueAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "accept_failed" };
    return { ok: true, state: data.state, follow: data.follow };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

/** @param {string} followId */
export async function rejectFollowRequest(followId) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/follow/requests/${encodeURIComponent(followId)}/reject`), {
      method: "POST",
      headers: vlueAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "reject_failed" };
    return { ok: true, follow: data.follow };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

/** @param {string} userId */
export async function fetchFollowCounts(userId) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/follow/counts/${encodeURIComponent(userId)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, counts: null, error: data.error };
    return { ok: true, counts: data.counts };
  } catch (e) {
    return { ok: false, counts: null, error: e?.message || "network" };
  }
}

/** @param {string} userId @param {{ limit?: number, cursor?: string }} [opts] */
export async function fetchFollowers(userId, opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  try {
    const res = await vlueAuthFetch(
      apiUrl(`/api/follow/followers/${encodeURIComponent(userId)}${qs ? `?${qs}` : ""}`)
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, items: [], error: data.error };
    return { ok: true, items: data.items || [], counts: data.counts, nextCursor: data.nextCursor };
  } catch (e) {
    return { ok: false, items: [], error: e?.message || "network" };
  }
}

/** @param {string} userId @param {{ limit?: number, cursor?: string }} [opts] */
export async function fetchFollowing(userId, opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  try {
    const res = await vlueAuthFetch(
      apiUrl(`/api/follow/following/${encodeURIComponent(userId)}${qs ? `?${qs}` : ""}`)
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, items: [], error: data.error };
    return { ok: true, items: data.items || [], counts: data.counts, nextCursor: data.nextCursor };
  } catch (e) {
    return { ok: false, items: [], error: e?.message || "network" };
  }
}

export async function fetchFollowRequestInbox() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/follow/requests/inbox"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, items: [], error: data.error };
    return { ok: true, items: data.items || [], pendingCount: data.pendingCount ?? 0 };
  } catch (e) {
    return { ok: false, items: [], error: e?.message || "network" };
  }
}

/** @param {string} userId */
export async function fetchFollowProfile(userId) {
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/follow/profile/${encodeURIComponent(userId)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "profile_failed" };
    return {
      ok: true,
      profile: data.profile,
      follow: data.follow,
      userId: data.userId,
      photoUrl: data.photoUrl || data.profile?.photoUrl || "",
      membershipTier: data.membershipTier || data.profile?.membershipTier || "",
      digitalCardIssued: Boolean(data.digitalCardIssued),
      cardExport: data.cardExport || null,
      authCycleEndAt: data.authCycleEndAt || null,
      authPaidAt: data.authPaidAt || null,
      cardIssuedAt: data.cardIssuedAt || null
    };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

export async function fetchFollowSettings() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/follow/settings"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, settings: null, error: data.error };
    return { ok: true, settings: data.settings };
  } catch (e) {
    return { ok: false, settings: null, error: e?.message || "network" };
  }
}

/** @param {Record<string, boolean>} patch */
export async function saveFollowSettings(patch = {}) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/follow/settings"), {
      method: "PUT",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, settings: null, error: data.error };
    return { ok: true, settings: data.settings };
  } catch (e) {
    return { ok: false, settings: null, error: e?.message || "network" };
  }
}

/** @param {FollowRelation} relation */
export function followButtonLabel(relation) {
  switch (relation) {
    case "mutual":
      return "맞팔로우";
    case "following":
      return "팔로잉";
    case "pending_out":
      return "요청중";
    case "pending_in":
      return "요청 받음";
    default:
      return "팔로우";
  }
}

/** @param {FollowRelation} relation */
export function isFollowActiveState(relation) {
  return relation === "following" || relation === "mutual" || relation === "pending_out";
}
