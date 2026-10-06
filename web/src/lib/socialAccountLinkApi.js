import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const LINKS_CACHE_KEY = "vlue_social_links_cache_v1";

export function readCachedSocialLinks() {
  try {
    const raw = localStorage.getItem(LINKS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedSocialLinks(links) {
  try {
    localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(links || []));
  } catch {
    /* ignore */
  }
}

export async function fetchSocialLinks() {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/social/links"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "연동 정보를 불러오지 못했습니다.");
  }
  const links = Array.isArray(data.links) ? data.links : [];
  writeCachedSocialLinks(links);
  return links;
}

export async function linkSocialAccount({ provider, socialToken }) {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/social/link"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ provider, socialToken })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "소셜 연동에 실패했습니다.");
  }
  try {
    await fetchSocialLinks();
  } catch {
    /* ignore refresh failure */
  }
  return data;
}

/** Google·네이버·Instagram OAuth 사후 연동 — 반환 URL로 이동 */
export async function startSocialOAuthLink(provider) {
  const p = String(provider || "").toLowerCase();
  const path =
    p === "google"
      ? "/api/v1/auth/google/link/start"
      : p === "naver"
        ? "/api/v1/auth/naver/link/start"
        : p === "instagram"
          ? "/api/v1/auth/instagram/link/start"
          : "";
  if (!path) throw new Error("지원하지 않는 소셜 연동입니다.");

  const res = await vlueAuthFetch(apiUrl(path), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "소셜 연동을 시작할 수 없습니다.");
  }
  const url = typeof data.url === "string" ? data.url.trim() : "";
  if (!url) throw new Error("소셜 인증 URL을 받지 못했습니다.");
  return url;
}

export function isProviderLinked(links, provider) {
  return (links || []).some((row) => String(row.provider).toLowerCase() === String(provider).toLowerCase());
}
