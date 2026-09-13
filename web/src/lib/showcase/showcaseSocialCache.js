import { fetchShowcaseSocial } from "./showcaseSocialApi.js";

const cache = new Map();
const inflight = new Map();
const TTL_MS = 90_000;

function cacheKey(ownerUserId, slideId) {
  return `${String(ownerUserId || "").trim()}::${String(slideId || "").trim()}`;
}

export function getCachedShowcaseSocial(ownerUserId, slideId) {
  const key = cacheKey(ownerUserId, slideId);
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

export function setCachedShowcaseSocial(ownerUserId, slideId, data) {
  if (!ownerUserId || !data?.ok) return;
  cache.set(cacheKey(ownerUserId, slideId), { ts: Date.now(), data });
}

/** 캐시 우선 — 없으면 네트워크. 인접 슬라이드 프리페치용 */
export function prefetchShowcaseSocial(ownerUserId, slideId) {
  const id = String(ownerUserId || "").trim();
  if (!id) return Promise.resolve({ ok: false, likeCount: 0, likedByMe: false, comments: [] });
  const cached = getCachedShowcaseSocial(id, slideId);
  if (cached) return Promise.resolve(cached);
  const key = cacheKey(id, slideId);
  const pending = inflight.get(key);
  if (pending) return pending;
  const req = fetchShowcaseSocial(id, { slideId }).then((res) => {
    inflight.delete(key);
    if (res.ok) setCachedShowcaseSocial(id, slideId, res);
    return res;
  });
  inflight.set(key, req);
  return req;
}

export function prefetchShowcaseSocialMany(ownerUserId, slideIds = []) {
  const id = String(ownerUserId || "").trim();
  if (!id) return;
  for (const slideId of slideIds) {
    void prefetchShowcaseSocial(id, slideId);
  }
}

export function prefetchShowcaseImages(urls = []) {
  for (const raw of urls) {
    const url = String(raw || "").trim();
    if (!url || url.startsWith("data:")) continue;
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    } catch {
      /* ignore */
    }
  }
}
