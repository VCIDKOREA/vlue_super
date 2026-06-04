const FAVORITES_KEY = "vlue_favorite_shop_ids_v1";

export const FAVORITE_SHOPS_CHANGED = "vlue-favorite-shops-changed";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function readFavoriteShopIds() {
  const ids = readJson(FAVORITES_KEY, []);
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id.trim()) : [];
}

export function isFavoriteShop(shopId) {
  const id = String(shopId || "").trim();
  return id ? readFavoriteShopIds().includes(id) : false;
}

export function toggleFavoriteShop(shopId) {
  const id = String(shopId || "").trim();
  if (!id) return { ok: false, favorited: false };
  const prev = readFavoriteShopIds();
  const exists = prev.includes(id);
  const next = exists ? prev.filter((x) => x !== id) : [id, ...prev];
  writeJson(FAVORITES_KEY, next.slice(0, 120));
  window.dispatchEvent(new Event(FAVORITE_SHOPS_CHANGED));
  return { ok: true, favorited: !exists, ids: next };
}
