import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

/**
 * GET /api/scrape-product?url=
 * @returns {Promise<{ ok: boolean, title?: string, price?: number, description?: string, imageUrl?: string, blocked?: boolean, message?: string }>}
 */
export async function fetchScrapeProduct(url) {
  const q = encodeURIComponent(String(url || "").trim());
  const res = await vlueAuthFetch(apiUrl(`/api/scrape-product?url=${q}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.blocked) {
    throw new Error(data.error || data.message || "상품 정보를 불러오지 못했습니다.");
  }
  return data;
}
