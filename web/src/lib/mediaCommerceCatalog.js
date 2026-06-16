import { slugStoreId } from "./mediaCommerceStores.js";
import { inferShoppingCategory } from "./shoppingCategories.js";

export const MEDIA_FEED_TABS = [
  { id: "all", label: "전체" },
  { id: "page", label: "페이지쇼핑" },
  { id: "groupbuy", label: "공동구매" },
  { id: "auction", label: "VLUE 경매" }
];

const THUMB_POOL = [
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=640&q=80",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=640&q=80",
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8f?w=640&q=80",
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=640&q=80",
  "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=640&q=80",
  "https://images.unsplash.com/photo-1507473889964-e6c31d5de15d?w=640&q=80",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=640&q=80",
  "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=640&q=80"
];

const RAW_ITEMS = [
  {
    id: "mc-1",
    tabs: ["ai", "live"],
    mediaPlatform: "youtube",
    youtubeVideoId: "jfKfPfyJRdk",
    sourceUrl: "https://www.coupang.com/vp/products/1234567890",
    channelName: "복합기·사무기기 소싱",
    viewsLabel: "2.4만",
    uploadedAgo: "24분 전",
    durationLabel: "1:13:38",
    overlayCaption: "복합기 소싱 → AI 상세페이지 초안",
    isLive: true,
    verified: true,
    isAiPick: true,
    isShort: false
  },
  {
    id: "mc-2",
    tabs: ["ai", "shorts", "live", "favorites"],
    mediaPlatform: "tiktok",
    youtubeVideoId: "ysz5S6PUM-U",
    sourceUrl: "https://smartstore.naver.com/main/products/9876543210",
    channelName: "영남 스마트 소싱",
    viewsLabel: "8.1천",
    uploadedAgo: "13일 전",
    durationLabel: "0:42",
    overlayCaption: "영남 스마트 소싱 대잔치",
    isLive: true,
    verified: false,
    isAiPick: true,
    isShort: true
  },
  {
    id: "mc-3",
    tabs: ["ai", "favorites"],
    mediaPlatform: "youtube",
    youtubeVideoId: "aqz-KE-bpKQ",
    sourceUrl: "https://www.coupang.com/vp/products/5555555555",
    channelName: "쿠팡 파트너 라이브",
    viewsLabel: "15만",
    uploadedAgo: "1주 전",
    durationLabel: "11:27",
    overlayCaption: "Coupang 상품소싱 | 라이브 특가",
    isLive: false,
    verified: true,
    isAiPick: true,
    isShort: false
  },
  {
    id: "mc-4",
    tabs: ["ai", "favorites"],
    mediaPlatform: "youtube",
    youtubeVideoId: "ScMzIvxBSi4",
    sourceUrl: "https://smartstore.naver.com/main/products/1111222233",
    channelName: "스마트스토어 위탁 B2B",
    viewsLabel: "3.2만",
    uploadedAgo: "1주 전",
    durationLabel: "2:05:04",
    overlayCaption: "SmartStore 위탁 | B2B 소싱",
    isLive: false,
    verified: true,
    isAiPick: false,
    isShort: false
  },
  {
    id: "mc-5",
    tabs: ["shorts", "live"],
    mediaPlatform: "instagram",
    youtubeVideoId: "kJQP7kiw5Fk",
    sourceUrl: "https://www.coupang.com/vp/products/7778889990",
    channelName: "릴스 커머스",
    viewsLabel: "42만",
    uploadedAgo: "3시간 전",
    durationLabel: "0:58",
    overlayCaption: "Reels · 인라인 소싱",
    isLive: true,
    verified: false,
    isAiPick: false,
    isShort: true
  },
  {
    id: "mc-6",
    tabs: ["ai", "live"],
    mediaPlatform: "youtube",
    youtubeVideoId: "C0DPdy98e4c",
    sourceUrl: "https://smartstore.naver.com/main/products/4444555566",
    channelName: "동네 실시간 쇼핑",
    viewsLabel: "실시간",
    uploadedAgo: "방금",
    durationLabel: "LIVE",
    overlayCaption: "우리 동네 라이브 쇼핑",
    isLive: true,
    verified: false,
    isAiPick: false,
    isShort: false
  },
  {
    id: "mc-7",
    tabs: ["shorts", "favorites"],
    mediaPlatform: "tiktok",
    youtubeVideoId: "9bZkp7q19f0",
    sourceUrl: "https://www.coupang.com/vp/products/3332221110",
    channelName: "별놈들",
    viewsLabel: "9.8만",
    uploadedAgo: "2일 전",
    durationLabel: "0:35",
    overlayCaption: "TikTok 라이브 · 공구 예고",
    isLive: false,
    verified: true,
    isAiPick: false,
    isShort: true
  },
  {
    id: "mc-8",
    tabs: ["ai", "live", "favorites"],
    mediaPlatform: "youtube",
    youtubeVideoId: "LXb3EKWsInQ",
    sourceUrl: "https://smartstore.naver.com/main/products/6666777788",
    channelName: "대구 상상 복합기",
    viewsLabel: "1.1만",
    uploadedAgo: "5시간 전",
    durationLabel: "45:12",
    overlayCaption: "무사고 완성은 사장님 능력",
    isLive: true,
    verified: true,
    isAiPick: true,
    isShort: false
  }
];

const PAGE_RAW_ITEMS = [
  {
    id: "pg-1",
    tabs: ["page"],
    commerceChannel: "page",
    channelName: "가구하우스",
    sourceUrl: "https://example.com/products/sofa-01",
    overlayCaption: "원목 3인용 소파",
    product: { title: "원목 3인용 소파", priceKrw: 389000, platform: "store" },
    isLive: false,
    isShort: false,
    youtubeVideoId: ""
  },
  {
    id: "pg-2",
    tabs: ["page"],
    commerceChannel: "page",
    channelName: "오피스마트",
    sourceUrl: "https://example.com/products/printer-a4",
    overlayCaption: "컬러 레이저 복합기 A4",
    product: { title: "컬러 레이저 복합기 A4", priceKrw: 549000, platform: "store" },
    isLive: false,
    isShort: false,
    youtubeVideoId: ""
  },
  {
    id: "pg-3",
    tabs: ["page"],
    commerceChannel: "page",
    channelName: "푸드마켓",
    sourceUrl: "https://example.com/products/snack-box",
    overlayCaption: "프리미엄 간식 박스",
    product: { title: "프리미엄 간식 박스", priceKrw: 28900, platform: "store" },
    isLive: false,
    isShort: false,
    youtubeVideoId: ""
  },
  {
    id: "pg-4",
    tabs: ["page"],
    commerceChannel: "page",
    channelName: "테크샵",
    sourceUrl: "https://example.com/products/earbuds",
    overlayCaption: "노이즈캔슬 이어폰",
    product: { title: "노이즈캔슬 이어폰", priceKrw: 129000, platform: "store" },
    isLive: false,
    isShort: false,
    youtubeVideoId: ""
  },
  {
    id: "pg-5",
    tabs: ["page"],
    commerceChannel: "page",
    channelName: "리빙스토어",
    sourceUrl: "https://example.com/products/kitchen-set",
    overlayCaption: "스테인리스 주방 6종 세트",
    product: { title: "스테인리스 주방 6종 세트", priceKrw: 45900, platform: "store" },
    isLive: false,
    isShort: false,
    youtubeVideoId: ""
  },
  {
    id: "pg-6",
    tabs: ["page"],
    commerceChannel: "page",
    channelName: "펫프렌즈",
    sourceUrl: "https://example.com/products/pet-bed",
    overlayCaption: "메모리폼 펫 베드",
    product: { title: "메모리폼 펫 베드", priceKrw: 34900, platform: "store" },
    isLive: false,
    isShort: false,
    youtubeVideoId: ""
  }
];

export function buildCatalogPool() {
  return RAW_ITEMS.map((row, i) => ({
    ...row,
    storeId: slugStoreId(row.channelName),
    thumbUrl: row.thumbUrl || THUMB_POOL[i % THUMB_POOL.length]
  }));
}

export function buildPageCatalogPool() {
  return PAGE_RAW_ITEMS.map((row, i) => ({
    ...row,
    storeId: slugStoreId(row.channelName),
    thumbUrl: row.thumbUrl || row.product?.imageUrl || THUMB_POOL[i % THUMB_POOL.length],
    mediaPlatform: "page"
  }));
}

export function filterByMediaTab(items, tabId, favoriteStoreIds = []) {
  if (tabId === "all") return items;
  if (tabId === "media") return items.filter((row) => row.isLive || row.isShort || Boolean(row.youtubeVideoId));
  if (tabId === "page") {
    return items.filter(
      (row) =>
        row.commerceChannel === "page" ||
        row.tabs?.includes("page") ||
        (!row.youtubeVideoId && !row.isLive && !row.isShort)
    );
  }
  if (tabId === "groupbuy") {
    return items.filter((row) => {
      const text = `${row?.overlayCaption || ""} ${row?.channelName || ""} ${row?.sourceUrl || ""}`.toLowerCase();
      return row.isLive || /공동구매|공구|groupbuy/.test(text);
    });
  }
  if (tabId === "ai") return items;
  if (tabId === "shorts") return items.filter((row) => row.isShort);
  if (tabId === "live") return items.filter((row) => row.isLive);
  if (tabId === "favorites") {
    const fav = new Set(favoriteStoreIds);
    if (!fav.size) return items.filter((row) => row.tabs.includes("favorites"));
    return items.filter((row) => fav.has(row.storeId));
  }
  return items;
}

export function getAiRecommendItems(items) {
  return items.filter((row) => row.isAiPick).slice(0, 6);
}

function relatedHashScore(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h % 7;
}

/** 현재 상품과 유사한 추천 (카테고리·스토어·가격대·플랫폼 가중) */
export function getRelatedFeedItems(pool, currentItem, limit = 10) {
  if (!currentItem?.id || !Array.isArray(pool)) return [];
  const currentId = currentItem.id;
  const currentCat = inferShoppingCategory(currentItem);
  const currentPlatform = currentItem.mediaPlatform;
  const currentStore = currentItem.storeId;
  const currentPrice = Number(currentItem.product?.priceKrw) || 0;
  const currentMall = currentItem.product?.platform;

  const scored = pool
    .filter((row) => row.id !== currentId)
    .map((item) => {
      let score = 0;
      const cat = inferShoppingCategory(item);
      if (currentCat !== "전체" && cat === currentCat) score += 45;
      if (item.mediaPlatform === currentPlatform) score += 12;
      if (currentStore && item.storeId === currentStore) score += 30;
      const price = Number(item.product?.priceKrw) || 0;
      if (currentPrice > 0 && price > 0) {
        const ratio = Math.min(price, currentPrice) / Math.max(price, currentPrice);
        score += Math.round(ratio * 18);
      }
      if (currentMall && item.product?.platform === currentMall) score += 8;
      score += Number(item.isAiPick) * 4;
      score += parseViews(item.viewsLabel) * 0.0008;
      score += relatedHashScore(item.id);
      return { item, score };
    });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.item);
}

export function sortForTab(items, tabId) {
  const list = [...items];
  if (tabId === "all") return list.sort((a, b) => parseViews(b.viewsLabel) - parseViews(a.viewsLabel));
  if (tabId === "media") {
    return list.sort(
      (a, b) =>
        Number(b.isLive) - Number(a.isLive) ||
        Number(b.isShort) - Number(a.isShort) ||
        parseViews(b.viewsLabel) - parseViews(a.viewsLabel)
    );
  }
  if (tabId === "page") return list.sort((a, b) => parseViews(b.viewsLabel) - parseViews(a.viewsLabel));
  if (tabId === "groupbuy") {
    return list.sort((a, b) => Number(b.isLive) - Number(a.isLive) || parseViews(b.viewsLabel) - parseViews(a.viewsLabel));
  }
  if (tabId === "live") return list.sort((a, b) => Number(b.isLive) - Number(a.isLive));
  if (tabId === "shorts") return list.sort((a, b) => parseViews(b.viewsLabel) - parseViews(a.viewsLabel));
  if (tabId === "ai") {
    return list.sort((a, b) => Number(b.isAiPick) - Number(a.isAiPick) || parseViews(b.viewsLabel) - parseViews(a.viewsLabel));
  }
  return list.sort((a, b) => parseViews(b.viewsLabel) - parseViews(a.viewsLabel));
}

function parseViews(label) {
  const s = String(label || "");
  if (s.includes("만")) return parseFloat(s) * 10000 || 0;
  if (s.includes("천")) return parseFloat(s) * 1000 || 0;
  if (s === "실시간") return 999999;
  return parseFloat(s) || 0;
}

export function paginateFeed(items, page, pageSize) {
  const start = page * pageSize;
  return {
    slice: items.slice(start, start + pageSize),
    hasMore: start + pageSize < items.length
  };
}

export function youtubeEmbedUrl(videoId, autoplay = true) {
  const id = encodeURIComponent(String(videoId || "").trim());
  const q = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1"
  });
  return `https://www.youtube.com/embed/${id}?${q}`;
}

export function platformLabel(platform) {
  if (platform === "coupang") return "쿠팡";
  if (platform === "smartstore") return "네이버";
  return "외부몰";
}

export function feedDisplayTitle(item) {
  const p = item?.product;
  if (p?.title && p.title !== "인라인 소싱 상품" && !/^coupang 소싱|^smartstore 소싱/i.test(p.title)) {
    return p.title;
  }
  return item?.overlayCaption || p?.title || "미디어 커머스";
}

export function feedMetaLine(item) {
  const views = item?.viewsLabel || "0";
  const ago = item?.uploadedAgo || "";
  const mall =
    item?.product?.platform === "coupang"
      ? "쿠팡"
      : item?.product?.platform === "smartstore"
        ? "네이버"
        : "";
  const parts = [`조회수 ${views}회`];
  if (ago) parts.push(ago);
  if (mall) parts.unshift(mall);
  return parts.join(" · ");
}

export function mediaPlatformBadge(platform) {
  const p = String(platform || "").toLowerCase();
  if (p === "youtube") return { label: "YouTube", className: "bg-red-600" };
  if (p === "tiktok") return { label: "TikTok", className: "bg-black" };
  if (p === "instagram") return { label: "Reels", className: "bg-gradient-to-r from-purple-600 to-pink-500" };
  return { label: p, className: "bg-neutral-700" };
}

export const FEED_SCROLL_BOTTOM_PAD = "calc(7.5rem + env(safe-area-inset-bottom, 0px))";

export const LEGACY_TAB_MAP = {
  media: "all",
  page: "page",
  groupbuy: "groupbuy",
  ai: "all",
  shorts: "all",
  live: "all",
  favorites: "all",
  all: "all",
  local: "all",
  popular: "all",
  recommend: "all"
};
