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

export function isProviderLinked(links, provider) {
  return (links || []).some((row) => String(row.provider).toLowerCase() === String(provider).toLowerCase());
}
