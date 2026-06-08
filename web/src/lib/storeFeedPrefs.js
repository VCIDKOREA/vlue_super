/** VLUE 스토어 — 웹(www) · 앱(/app) 공통 탭·카테고리 기억 */
import { MEDIA_FEED_TABS } from "./mediaCommerceCatalog.js";
import { normalizeShoppingCategory } from "./shoppingCategories.js";

const TAB_KEY = "vlue_store_feed_tab_v1";
const CATEGORY_KEY = "vlue_store_feed_category_v1";
export const STORE_FEED_PREFS_CHANGED = "vlue-store-feed-prefs-changed";

const MEDIA_TAB_IDS = new Set(MEDIA_FEED_TABS.map((t) => t.id));

export function readStoreFeedTab(fallback = "all") {
  try {
    const raw = String(localStorage.getItem(TAB_KEY) || "").trim();
    return MEDIA_TAB_IDS.has(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoreFeedTab(tabId) {
  const id = String(tabId || "").trim();
  if (!MEDIA_TAB_IDS.has(id)) return;
  try {
    localStorage.setItem(TAB_KEY, id);
    window.dispatchEvent(new CustomEvent(STORE_FEED_PREFS_CHANGED, { detail: { tab: id } }));
  } catch {
    /* ignore */
  }
}

export function readStoreFeedCategory(fallback = "전체") {
  try {
    return normalizeShoppingCategory(localStorage.getItem(CATEGORY_KEY) || fallback);
  } catch {
    return fallback;
  }
}

export function writeStoreFeedCategory(category) {
  const cat = normalizeShoppingCategory(category);
  try {
    localStorage.setItem(CATEGORY_KEY, cat);
    window.dispatchEvent(new CustomEvent(STORE_FEED_PREFS_CHANGED, { detail: { category: cat } }));
  } catch {
    /* ignore */
  }
}
