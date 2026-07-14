import { apiUrl } from "../apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../vlueAuthHeaders.js";

/** 유료 회원 — 서버 showcase_tags 동기화 (V1) */
export async function syncShowcaseTagsToServer(tags = []) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/showcase/tags"), {
      method: "PUT",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ tags })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, ...data };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

/**
 * V1 — 쇼케이스 검색 (인증 필수 · 상호주의 · 마스킹)
 * @param {string} query
 * @param {{ mode?: 'hashtag'|'phone'|'name'|'id' }} [opts]
 */
export async function searchShowcaseByTag(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return { ok: true, items: [] };
  const mode = opts.mode || "hashtag";
  try {
    const params = new URLSearchParams({ q, mode });
    const res = await vlueAuthFetch(apiUrl(`/api/lettering/showcase/tags/search?${params}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        items: [],
        error: data.error || "search_failed",
        code: data.code,
        meta: data.meta,
        status: res.status
      };
    }
    return { ok: true, items: data.items || [], tag: data.tag, mode: data.mode || mode };
  } catch (e) {
    return { ok: false, items: [], error: e?.message || "network" };
  }
}

export async function fetchShowcaseSearchPrivacy() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/showcase/search-privacy"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, privacy: null, error: data.error };
    return { ok: true, privacy: data.privacy };
  } catch (e) {
    return { ok: false, privacy: null, error: e?.message || "network" };
  }
}

export async function saveShowcaseSearchPrivacy(patch = {}) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/showcase/search-privacy"), {
      method: "PUT",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, privacy: null, error: data.error };
    return { ok: true, privacy: data.privacy };
  } catch (e) {
    return { ok: false, privacy: null, error: e?.message || "network" };
  }
}
