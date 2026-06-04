import { normalizeShoppingCategory } from "./shoppingCategories.js";
import {
  buildCatalogPool,
  buildPageCatalogPool,
  filterByMediaTab,
  getAiRecommendItems,
  paginateFeed,
  sortForTab
} from "./mediaCommerceCatalog.js";
import { readFavoriteStoreIds, slugStoreId } from "./mediaCommerceStores.js";
import {
  addVaultItem,
  createGroupBuyCampaign,
  fetchGroupBuyTick,
  fetchPageFeed,
  postGroupBuyTick,
  postInlineSourcingImport
} from "./vlueCoreShoppingApi.js";
import { emitVaultChanged, readCampaignMetaMap, writeCampaignMeta } from "./shoppingCoreStorage.js";

const ENRICH_CACHE_KEY = "vlue_media_feed_enrich_v1";
const CAMPAIGN_LINK_KEY = "vlue_media_feed_campaign_v1";
const PAGE_SIZE = 6;

function readEnrichCache() {
  try {
    const raw = localStorage.getItem(ENRICH_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeEnrichCache(map) {
  try {
    localStorage.setItem(ENRICH_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function readCampaignLinks() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_LINK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCampaignLink(feedId, campaignId) {
  const map = readCampaignLinks();
  map[feedId] = campaignId;
  localStorage.setItem(CAMPAIGN_LINK_KEY, JSON.stringify(map));
}

export function getCampaignIdForFeed(feedId) {
  return readCampaignLinks()[feedId] || "";
}

/** 인라인 소싱 API로 상품 메타 보강 */
export async function enrichFeedItem(item) {
  const cache = readEnrichCache();
  if (cache[item.id]) {
    return { ...item, product: cache[item.id] };
  }
  try {
    const data = await postInlineSourcingImport(item.sourceUrl);
    const product = {
      ...data.item,
      imageUrl: data.item?.imageUrl || item.thumbUrl || "",
      enriched: true,
      mediaPlatform: item.mediaPlatform,
      youtubeVideoId: item.youtubeVideoId
    };
    cache[item.id] = product;
    writeEnrichCache(cache);
    return { ...item, product };
  } catch {
    return {
      ...item,
      product: {
        sourceUrl: item.sourceUrl,
        platform: "unknown",
        title: "연동 상품",
        priceKrw: 0,
        imageUrl: String(item.thumbUrl || "").trim() || "",
        options: []
      }
    };
  }
}

export async function enrichFeedBatch(items) {
  const out = [];
  for (const row of items) {
    out.push(await enrichFeedItem(row));
  }
  return out;
}

export function mapVaultRowToFeedItem(row) {
  const payload =
    typeof row.payload_json === "string"
      ? JSON.parse(row.payload_json)
      : row.payload_json || row.payloadJson || {};
  const title = row.title || payload.title || "페이지 상품";
  const videoUrl = String(payload.videoUrl || "").trim();
  const imageUrl = payload.imageUrl || payload.imageUrls?.[0] || "";
  const isVideoProduct = payload.mediaKind === "video" || Boolean(videoUrl);
  return {
    id: `vault-${row.id}`,
    commerceChannel: "page",
    storeId: slugStoreId(title),
    channelName: "페이지 쇼핑",
    sourceUrl: payload.sourceUrl || "",
    thumbUrl: imageUrl || (isVideoProduct ? "" : ""),
    videoUrl: videoUrl || undefined,
    overlayCaption: title,
    product: {
      title,
      priceKrw: Number(payload.priceKrw) || 0,
      imageUrl,
      videoUrl: videoUrl || undefined,
      platform: payload.platform || "store",
      description: payload.description || "",
      mediaKind: payload.mediaKind || ""
    },
    isLive: false,
    isShort: isVideoProduct,
    youtubeVideoId: "",
    mediaPlatform: "page",
    viewsLabel: "신규",
    uploadedAgo: "방금",
    shoppingCategory: normalizeShoppingCategory(payload.category)
  };
}

let pageFeedCache = null;
let pageFeedCacheAt = 0;

async function loadPageFeedPool() {
  const now = Date.now();
  if (pageFeedCache && now - pageFeedCacheAt < 8000) return pageFeedCache;
  const staticPool = buildPageCatalogPool();
  try {
    const { items } = await fetchPageFeed();
    const vaultRows = (items || []).map(mapVaultRowToFeedItem);
    const seen = new Set(vaultRows.map((x) => x.id));
    const merged = [...vaultRows, ...staticPool.filter((x) => !seen.has(x.id))];
    pageFeedCache = merged;
    pageFeedCacheAt = now;
    return merged;
  } catch {
    pageFeedCache = staticPool;
    pageFeedCacheAt = now;
    return staticPool;
  }
}

export function invalidatePageFeedCache() {
  pageFeedCache = null;
  pageFeedCacheAt = 0;
}

export async function getFeedPageAsync(mediaTab, page) {
  const favs = readFavoriteStoreIds();
  if (mediaTab === "page") {
    const pool = sortForTab(await loadPageFeedPool(), mediaTab);
    const { slice, hasMore } = paginateFeed(pool, page, PAGE_SIZE);
    return { items: slice, hasMore, total: pool.length };
  }
  const pool = sortForTab(filterByMediaTab(buildCatalogPool(), mediaTab, favs), mediaTab);
  const { slice, hasMore } = paginateFeed(pool, page, PAGE_SIZE);
  return { items: slice, hasMore, total: pool.length };
}

export function getFeedPage(mediaTab, page) {
  const favs = readFavoriteStoreIds();
  const pool =
    mediaTab === "page"
      ? sortForTab(buildPageCatalogPool(), mediaTab)
      : sortForTab(filterByMediaTab(buildCatalogPool(), mediaTab, favs), mediaTab);
  const { slice, hasMore } = paginateFeed(pool, page, PAGE_SIZE);
  return { items: slice, hasMore, total: pool.length };
}

export function getAllShortsItems() {
  const favs = readFavoriteStoreIds();
  return sortForTab(filterByMediaTab(buildCatalogPool(), "shorts", favs), "shorts");
}

/** AI 추천 스트립 전용 — 페이지네이션과 무관하게 전체 AI 픽 로드 */
export async function loadAiRecommendEnriched() {
  const picks = getAiRecommendItems(buildCatalogPool());
  return enrichFeedBatch(picks);
}

/** 피드 카드 1건 ↔ 공구 캠페인 */
export async function ensureCampaignForFeedItem(item) {
  const existing = getCampaignIdForFeed(item.id);
  if (existing) {
    try {
      const { tick } = await fetchGroupBuyTick(existing);
      return { campaignId: existing, tick };
    } catch {
      /* recreate */
    }
  }
  const title = item.product?.title || "라이브 공동구매";
  const { campaign } = await createGroupBuyCampaign({
    title,
    targetQty: 100,
    durationMinutes: 120
  });
  const priceKrw = Number(item.product?.priceKrw) || 0;
  writeCampaignMeta(campaign.id, {
    feedId: item.id,
    priceKrw: priceKrw || 49000,
    comparePriceKrw: priceKrw ? Math.round(priceKrw * 1.25) : 69000,
    imageUrl: item.product?.imageUrl || item.thumbUrl,
    sourceUrl: item.sourceUrl,
    platform: item.product?.platform
  });
  writeCampaignLink(item.id, campaign.id);
  const { tick } = await fetchGroupBuyTick(campaign.id);
  return { campaignId: campaign.id, tick };
}

export function readCampaignCommerceMeta(campaignId) {
  return readCampaignMetaMap()[campaignId] || null;
}

/** 결제(데모) → 공구 tick + Vault */
export async function completeFeedCheckout({ item, campaignId }) {
  await postGroupBuyTick(campaignId, 1);
  const product = item.product || {};
  const priceKrw = Number(product.priceKrw) || readCampaignCommerceMeta(campaignId)?.priceKrw || 0;
  await addVaultItem({
    title: product.title || "공구 참여 상품",
    kind: "order",
    payloadJson: {
      feedId: item.id,
      campaignId,
      sourceUrl: item.sourceUrl,
      platform: product.platform,
      priceKrw,
      youtubeVideoId: item.youtubeVideoId,
      mediaPlatform: item.mediaPlatform,
      paidAt: new Date().toISOString(),
      status: "paid"
    }
  });
  emitVaultChanged();
  const { tick } = await fetchGroupBuyTick(campaignId);
  return tick;
}
