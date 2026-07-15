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
      body: JSON.stringify({ slideId: opts.slideId || "" })
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
        body: JSON.stringify({ body, slideId: opts.slideId || "" })
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
