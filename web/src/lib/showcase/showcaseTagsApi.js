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
 * 검색어로 API mode 추론
 * `#태그` → hashtag, `@아이디` → id (명시 접두사 우선)
 * @returns {'hashtag'|'phone'|'name'|'id'|null} null = 로컬/업종만
 */
export function detectShowcaseSearchMode(query) {
  const q = String(query || "").trim();
  if (!q) return null;
  /* 명시 접두사 — 사용자가 # / @ 로 검색 의도를 지정한 경우 */
  if (q.startsWith("#") || /(?:^|\s)#[\w가-힣_]+/i.test(q)) return "hashtag";
  if (q.startsWith("@")) return "id";
  const digits = q.replace(/\D/g, "");
  const nonDigit = q.replace(/[\d\s\-()+.]/g, "");
  if (digits.length >= 9 && nonDigit.length <= 2) return "phone";
  /* @ 없이도 영문 핸들 형태면 아이디 검색 */
  if (/^[a-zA-Z][a-zA-Z0-9._-]{1,31}$/.test(q)) return "id";
  if (q.length >= 2) return "name";
  return null;
}

/**
 * V1 — 쇼케이스 검색 (인증 필수 · 상호주의 · 마스킹)
 * @param {string} query
 * @param {{ mode?: 'hashtag'|'phone'|'name'|'id' }} [opts]
 */
export async function searchShowcaseByTag(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return { ok: true, items: [] };
  const mode = opts.mode || detectShowcaseSearchMode(q) || "hashtag";
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
