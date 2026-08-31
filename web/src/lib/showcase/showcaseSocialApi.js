import { apiUrl } from "../apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../vlueAuthHeaders.js";

/**
 * V2 쇼케이스 소셜 API 클라
 */
export async function fetchShowcaseSocial(ownerUserId, opts = {}) {
  const id = String(ownerUserId || "").trim();
  if (!id) return { ok: false, likeCount: 0, likedByMe: false, comments: [] };
  try {
    const params = new URLSearchParams();
    if (opts.slideId) params.set("slideId", String(opts.slideId));
    const q = params.toString();
    const res = await vlueAuthFetch(
      apiUrl(`/api/lettering/showcase/social/${encodeURIComponent(id)}${q ? `?${q}` : ""}`)
    );
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      likeCount: Number(data.likeCount) || 0,
      likedByMe: Boolean(data.likedByMe),
      recentLiker: data.recentLiker || null,
      comments: Array.isArray(data.comments) ? data.comments : [],
      error: data.error
    };
  } catch (e) {
    return { ok: false, likeCount: 0, likedByMe: false, comments: [], error: e?.message };
  }
}

export async function toggleShowcaseLikeApi(ownerUserId, opts = {}) {
  const id = String(ownerUserId || "").trim();
  if (!id) return { ok: false };
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/lettering/showcase/social/${encodeURIComponent(id)}/like`), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        slideId: opts.slideId || "",
        ...(typeof opts.liked === "boolean" ? { liked: opts.liked } : {}),
        ...(opts.contentOrdinal ? { contentOrdinal: opts.contentOrdinal } : {})
      })
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      likedByMe: Boolean(data.likedByMe),
      likeCount: Number(data.likeCount) || 0,
      error: data.error,
      status: res.status
    };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

export async function patchShowcaseComment(ownerUserId, commentId, body) {
  const id = String(ownerUserId || "").trim();
  const cid = String(commentId || "").trim();
  if (!id || !cid) return { ok: false };
  try {
    const res = await vlueAuthFetch(
      apiUrl(`/api/lettering/showcase/social/${encodeURIComponent(id)}/comments/${encodeURIComponent(cid)}`),
      {
        method: "PATCH",
        headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      }
    );
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      comment: data.comment || null,
      error: data.error,
      status: res.status
    };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

export async function deleteShowcaseCommentApi(ownerUserId, commentId) {
  const id = String(ownerUserId || "").trim();
  const cid = String(commentId || "").trim();
  if (!id || !cid) return { ok: false };
  try {
    const res = await vlueAuthFetch(
      apiUrl(`/api/lettering/showcase/social/${encodeURIComponent(id)}/comments/${encodeURIComponent(cid)}`),
      { method: "DELETE", headers: vlueAuthHeaders() }
    );
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.error, status: res.status };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

export async function recordShowcaseShareApi(ownerUserId, opts = {}) {
  const id = String(ownerUserId || "").trim();
  if (!id) return { ok: false };
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/lettering/showcase/social/${encodeURIComponent(id)}/share`), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ slideId: opts.slideId || "" })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.error, status: res.status };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

export async function fetchShowcaseLikes(ownerUserId, opts = {}) {
  const id = String(ownerUserId || "").trim();
  if (!id) return { ok: false, likes: [] };
  try {
    const params = new URLSearchParams();
    if (opts.slideId) params.set("slideId", String(opts.slideId));
    const q = params.toString();
    const res = await vlueAuthFetch(
      apiUrl(`/api/lettering/showcase/social/${encodeURIComponent(id)}/likes${q ? `?${q}` : ""}`)
    );
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      likes: Array.isArray(data.likes) ? data.likes : [],
      error: data.error
    };
  } catch (e) {
    return { ok: false, likes: [], error: e?.message };
  }
}

export async function fetchShowcaseComments(ownerUserId, opts = {}) {
  const id = String(ownerUserId || "").trim();
  if (!id) return { ok: false, comments: [] };
  try {
    const params = new URLSearchParams();
    if (opts.slideId) params.set("slideId", String(opts.slideId));
    const q = params.toString();
    const res = await vlueAuthFetch(
      apiUrl(`/api/lettering/showcase/social/${encodeURIComponent(id)}/comments${q ? `?${q}` : ""}`)
    );
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      comments: Array.isArray(data.comments) ? data.comments : [],
      error: data.error
    };
  } catch (e) {
    return { ok: false, comments: [], error: e?.message };
  }
}

export async function postShowcaseComment(ownerUserId, body, opts = {}) {
  const id = String(ownerUserId || "").trim();
  if (!id) return { ok: false };
  try {
    const res = await vlueAuthFetch(
      apiUrl(`/api/lettering/showcase/social/${encodeURIComponent(id)}/comments`),
      {
        method: "POST",
        headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          slideId: opts.slideId || "",
          parentId: opts.parentId || null
        })
      }
    );
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      comment: data.comment || null,
      error: data.error,
      status: res.status
    };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

/** @handle → userId 조회 (멘션) */
export async function lookupUserByHandle(handle) {
  const h = String(handle || "")
    .replace(/^@+/, "")
    .trim();
  if (!h) return { ok: false };
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/follow/handle/${encodeURIComponent(h)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error, status: res.status };
    return { ok: true, user: data.user || null };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}
