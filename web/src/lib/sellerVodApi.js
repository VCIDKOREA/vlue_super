import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `요청 실패 (${res.status})`);
  }
  return data;
}

/** 판매자 개인 상점 — [지난 라이브 특가 상품] VOD 목록 */
export async function fetchSellerVodProducts(sellerUserId, { category = "past_live_deals", limit = 20 } = {}) {
  const q = new URLSearchParams({ category, limit: String(limit) });
  const res = await vlueAuthFetch(apiUrl(`/api/media-commerce/seller/${sellerUserId}/vod?${q}`));
  const data = await parseJson(res);
  return data.items || [];
}

export function mapSellerVodToFeedItem(vod, storeProfile) {
  return {
    id: `vod-${vod.id}`,
    commerceChannel: "vod",
    storeId: storeProfile?.storeId || "seller-shop",
    channelName: storeProfile?.channelName || "개인 상점",
    sourceUrl: "",
    thumbUrl: vod.thumbUrl || "",
    videoUrl: vod.videoUrl,
    overlayCaption: vod.productTitle || vod.title,
    product: {
      title: vod.productTitle || vod.title,
      priceKrw: vod.priceKrw || 0,
      imageUrl: vod.thumbUrl || "",
      videoUrl: vod.videoUrl,
      platform: vod.platform || "vod"
    },
    isLive: false,
    isShort: vod.aspectRatio === "9:16",
    isVod: true,
    vodId: vod.id,
    aspectRatio: vod.aspectRatio || "16:9",
    youtubeVideoId: "",
    mediaPlatform: vod.platform || "vod",
    viewsLabel: `${vod.viewCount || 0}회`,
    uploadedAgo: "지난 라이브"
  };
}

export async function postLiveSession({ title, streamUrl, platform, aspectRatio }) {
  const res = await vlueAuthFetch(apiUrl("/api/live/sessions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, streamUrl, platform, aspectRatio })
  });
  return parseJson(res);
}
