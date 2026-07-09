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

/** V1 — #해시태그 쇼케이스 검색 (홈 디렉토리) */
export async function searchShowcaseByTag(query) {
  const q = String(query || "").trim();
  if (!q) return { ok: true, items: [] };
  try {
    const res = await fetch(apiUrl(`/api/lettering/showcase/tags/search?${new URLSearchParams({ q })}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, items: [], error: data.error };
    return { ok: true, items: data.items || [], tag: data.tag };
  } catch (e) {
    return { ok: false, items: [], error: e?.message || "network" };
  }
}
