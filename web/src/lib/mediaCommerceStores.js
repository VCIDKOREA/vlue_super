import { buildCatalogPool } from "./mediaCommerceCatalog.js";

const FAVORITES_KEY = "vlue_favorite_stores_v1";

export function slugStoreId(channelName) {
  return String(channelName || "store")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .slice(0, 48);
}

export function readFavoriteStoreIds() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr) && arr.length) return arr;
  } catch {
    /* ignore */
  }
  const defaults = buildCatalogPool()
    .filter((row) => row.tabs?.includes("favorites"))
    .map((row) => row.storeId)
    .filter((id, i, a) => a.indexOf(id) === i)
    .slice(0, 3);
  return defaults;
}

export function writeFavoriteStoreIds(ids) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function toggleFavoriteStore(storeId) {
  const set = new Set(readFavoriteStoreIds());
  if (set.has(storeId)) set.delete(storeId);
  else set.add(storeId);
  const next = [...set];
  writeFavoriteStoreIds(next);
  return next;
}

export function isFavoriteStore(storeId) {
  return readFavoriteStoreIds().includes(storeId);
}

export function getStoreProfile(storeId) {
  const items = buildCatalogPool().filter((row) => row.storeId === storeId);
  if (!items.length) return null;
  const first = items[0];
  const mediaAssetCount = items.filter((x) => x.isLive || x.isShort || Boolean(x.youtubeVideoId)).length;
  const shopMode = mediaAssetCount >= Math.max(1, Math.ceil(items.length * 0.4)) ? "MEDIA" : "PAGE";
  return {
    storeId,
    channelName: first.channelName,
    verified: first.verified,
    itemCount: items.length,
    liveCount: items.filter((x) => x.isLive).length,
    shopMode,
    items
  };
}

export function listAllStores() {
  const map = new Map();
  for (const row of buildCatalogPool()) {
    if (!map.has(row.storeId)) {
      map.set(row.storeId, {
        storeId: row.storeId,
        channelName: row.channelName,
        verified: row.verified,
        thumbUrl: row.thumbUrl
      });
    }
  }
  return [...map.values()];
}
