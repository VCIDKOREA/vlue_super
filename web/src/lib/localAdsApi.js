import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

export async function fetchLocalAds() {
  const res = await fetch(apiUrl("/api/ads"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !Array.isArray(data.ads)) {
    throw new Error(data.error || `지역 광고 목록 조회 실패 (${res.status})`);
  }
  return { ads: Array.isArray(data.ads) ? data.ads : [] };
}

export async function createLocalAd(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/ads"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `광고 등록 실패 (${res.status})`);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

/** API 광고 → 홈 핫플레이스 카드 형식 (AI 송출 점수 반영) */
export function mapLocalAdToStoreCard(ad, index = 0) {
  const fallbackImg =
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80";
  const aiScore = typeof ad.aiScore === "number" ? ad.aiScore : 70 - Math.min(index, 12);
  return {
    id: `local-ad-${ad.id}`,
    adId: ad.id,
    name: ad.storeName,
    distance: Math.min(2, 0.2 + index * 0.05),
    popular: aiScore,
    rating: 4.9,
    likes: 120 + index * 17,
    img: ad.imageUrl || fallbackImg,
    tag: "VLUE 광고",
    roomId: null,
    location: ad.location,
    description: ad.description,
    isUserAd: true,
    aiScore,
    feedPostId: ad.feedPostId || null,
    reviews: [`"${ad.description}" — ${ad.location}`]
  };
}
