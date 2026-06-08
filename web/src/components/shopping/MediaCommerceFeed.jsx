import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FEED_SCROLL_BOTTOM_PAD, feedDisplayTitle, feedMetaLine, MEDIA_FEED_TABS, mediaPlatformBadge } from "../../lib/mediaCommerceCatalog.js";
import {
  enrichFeedBatch,
  getFeedPage,
  getFeedPageAsync,
  invalidatePageFeedCache
} from "../../lib/mediaCommerceFeedService.js";
import { VAULT_CHANGED } from "../../lib/shoppingCoreStorage.js";
import { feedTheme } from "../../lib/mediaCommerceTheme.js";
import MediaCommercePlayerSheet from "./MediaCommercePlayerSheet.jsx";
import MediaCommerceShortsPlayer from "./MediaCommerceShortsPlayer.jsx";
import ShortsCarousel from "./ShortsCarousel.jsx";
import StoreProfileHome from "./StoreProfileHome.jsx";
import AiSourcingUploadScreen from "./AiSourcingUploadScreen.jsx";
import ChannelProfileLink from "./ChannelProfileLink.jsx";
import FeedThumbImage from "./FeedThumbImage.jsx";
import SwipeableChipTabs from "./SwipeableChipTabs.jsx";
import CategoryPickerOverlay from "./CategoryPickerOverlay.jsx";
import {
  SHOPPING_CATEGORIES,
  inferShoppingCategory,
  normalizeShoppingCategory
} from "../../lib/shoppingCategories.js";
import {
  readStoreFeedCategory,
  writeStoreFeedCategory,
  STORE_FEED_PREFS_CHANGED
} from "../../lib/storeFeedPrefs.js";

function DurationBadge({ label, isLive }) {
  if (isLive) {
    return (
      <span className="absolute bottom-1 right-1 rounded px-1 py-0.5 text-[10px] font-bold text-white bg-black/75">
        LIVE
      </span>
    );
  }
  return (
    <span className="absolute bottom-1 right-1 rounded bg-black/85 px-1 py-0.5 text-[10px] font-bold tabular-nums text-white">
      {label || "0:00"}
    </span>
  );
}

function ThumbBadges({ item }) {
  const badge = mediaPlatformBadge(item.mediaPlatform);
  return (
    <div className="absolute left-1 top-1 flex max-w-[90%] flex-wrap gap-1">
      {item.isLive ? (
        <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-black text-white bg-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      ) : null}
      <span className={`rounded px-1 py-0.5 text-[9px] font-bold text-white ${badge.className}`}>{badge.label}</span>
    </div>
  );
}

function FeedHeroCard({ item, theme, onOpen, onOpenStore }) {
  const title = feedDisplayTitle(item);

  return (
    <button type="button" onClick={() => onOpen(item)} className="mb-4 w-full text-left">
      <div className={`relative aspect-video w-full overflow-hidden rounded-xl ${theme.thumbBg}`}>
        <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
        <ThumbBadges item={item} />
        <DurationBadge label={item.durationLabel} isLive={item.isLive} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </div>
      <div className="mt-2.5 flex gap-2 pr-2">
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <ChannelProfileLink item={item} onOpenStore={onOpenStore} isDarkMode={false} layout="column" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`line-clamp-2 text-[15px] font-semibold leading-snug ${theme.title}`}>{title}</h2>
          <p className={`mt-1 text-[12px] ${theme.meta}`}>{feedMetaLine(item)}</p>
        </div>
      </div>
    </button>
  );
}

function AdBannerSlot({ item, onOpenStore, theme }) {
  if (!item) return null;
  return (
    <article className={`mb-3 overflow-hidden rounded-2xl border shadow-sm ${theme.adCard}`}>
      <div className="relative aspect-[16/8] w-full overflow-hidden bg-slate-100">
        <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
        <span className="absolute left-2 top-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white">광고</span>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className={`truncate text-[13px] font-black ${theme.title}`}>스폰서드 상품 배너</p>
          <p className={`truncate text-[11px] ${theme.meta}`}>{item.product?.title || feedDisplayTitle(item)}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenStore?.(item.storeId)}
          className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${theme.adBtn}`}
        >
          자세히
        </button>
      </div>
    </article>
  );
}

function FeedListRow({ item, theme, onOpen, onOpenStore }) {
  const title = feedDisplayTitle(item);

  return (
    <button type="button" onClick={() => onOpen(item)} className={`flex w-full gap-2 py-2.5 text-left active:opacity-90`}>
      <div className={`relative h-[94px] w-[168px] shrink-0 overflow-hidden rounded-xl ${theme.thumbBg}`}>
        <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
        <ThumbBadges item={item} />
        <DurationBadge label={item.durationLabel} isLive={item.isLive} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h3 className={`line-clamp-2 text-[14px] font-semibold leading-snug ${theme.title}`}>{title}</h3>
        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
          <ChannelProfileLink item={item} onOpenStore={onOpenStore} isDarkMode={false} />
        </div>
        <p className={`mt-0.5 line-clamp-1 text-[12px] ${theme.meta}`}>{feedMetaLine(item)}</p>
        {item.isLive ? (
          <span className="mt-1 w-fit rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">라이브 진행 중</span>
        ) : null}
      </div>
    </button>
  );
}

function ProductRow({ item, onOpenStore }) {
  const title = item?.product?.title || feedDisplayTitle(item);
  const price = Number(item?.product?.priceKrw || 0);
  return (
    <article className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-[12px] text-slate-500">{feedMetaLine(item)}</p>
        <p className="mt-1 text-[14px] font-black text-slate-900">{price > 0 ? `${price.toLocaleString()}원` : "가격 문의"}</p>
      </div>
      <button
        type="button"
        onClick={() => onOpenStore?.(item.storeId)}
        className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700"
      >
        상점
      </button>
    </article>
  );
}

function PageProductCard({ item, onCheckout }) {
  const title = item?.product?.title || feedDisplayTitle(item);
  const price = Number(item?.product?.priceKrw || 0);
  const img = item?.product?.imageUrl || item?.thumbUrl || "";
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-square w-full bg-slate-100">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-400">이미지</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 min-h-[2.5rem] text-[12px] font-semibold leading-snug text-slate-900">{title}</p>
        <p className="mt-1 text-[14px] font-black text-slate-900">{price > 0 ? `${price.toLocaleString()}원` : "가격 문의"}</p>
        <button
          type="button"
          onClick={() => onCheckout?.(item)}
          className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-[12px] font-black text-white"
        >
          바로결제
        </button>
      </div>
    </article>
  );
}

export default function MediaCommerceFeed({
  mediaTab,
  onChangeMediaTab,
  onToast,
  onShortsFullscreenChange,
  isDarkMode = false,
  isGuestMode = false,
  onRequireAuth
}) {
  const theme = feedTheme(isDarkMode);

  const guardGuestAction = useCallback(
    (action) => {
      if (!isGuestMode) {
        action?.();
        return;
      }
      onRequireAuth?.(action);
    },
    [isGuestMode, onRequireAuth]
  );
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [shortsOpen, setShortsOpen] = useState(false);
  const [shortsStartIndex, setShortsStartIndex] = useState(0);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [storeProfileId, setStoreProfileId] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(() => readStoreFeedCategory("전체"));
  const setCategorySafe = useCallback((next) => {
    const cat = normalizeShoppingCategory(next);
    setCategory(cat);
    writeStoreFeedCategory(cat);
  }, []);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const categoryTriggerRef = useRef(null);
  const searchBarRef = useRef(null);

  const openStore = useCallback((id) => setStoreProfileId(id), []);
  const openItemDetail = useCallback((item) => setSelected(item), []);

  const isPageMode = mediaTab === "page";

  const loadPage = useCallback(
    async (nextPage, replace = false) => {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoading(true);
      try {
        const { items: slice, hasMore: more } = isPageMode
          ? await getFeedPageAsync(mediaTab, nextPage)
          : getFeedPage(mediaTab, nextPage);
        const enriched = isPageMode ? slice : await enrichFeedBatch(slice);
        setItems((prev) => (replace ? enriched : [...prev, ...enriched]));
        setHasMore(more);
        setPage(nextPage);
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : "피드를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
        loadingMoreRef.current = false;
      }
    },
    [mediaTab, isPageMode, onToast]
  );

  useEffect(() => {
    const onPrefs = (e) => {
      const cat = e?.detail?.category;
      if (cat) setCategory(cat);
    };
    window.addEventListener(STORE_FEED_PREFS_CHANGED, onPrefs);
    return () => window.removeEventListener(STORE_FEED_PREFS_CHANGED, onPrefs);
  }, []);

  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    loadPage(0, true);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [mediaTab, loadPage]);

  useEffect(() => {
    if (!isPageMode) return undefined;
    const onVault = () => {
      invalidatePageFeedCache();
      loadPage(0, true);
    };
    window.addEventListener(VAULT_CHANGED, onVault);
    return () => window.removeEventListener(VAULT_CHANGED, onVault);
  }, [isPageMode, loadPage]);

  useEffect(() => {
    const root = scrollRef.current;
    const el = sentinelRef.current;
    if (!root || !el || !hasMore || loading) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadPage(page + 1, false);
      },
      { root, rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadPage, page, mediaTab]);

  useEffect(() => {
    const el = categoryTriggerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (categoryOpen) return;
      e.preventDefault();
      setCategoryOpen(true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [categoryOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const inferred = inferShoppingCategory(item);
      if (category !== "전체" && inferred !== category) return false;
      if (!q) return true;
      const haystack = `${feedDisplayTitle(item)} ${item.channelName || ""} ${item.product?.title || ""} ${item.sourceUrl || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, category]);

  const videoItems = useMemo(
    () => (isPageMode ? [] : filtered.filter((x) => x.isLive || x.isShort || Boolean(x.youtubeVideoId))),
    [filtered, isPageMode]
  );
  const shortsItems = useMemo(() => videoItems.filter((x) => x.isShort), [videoItems]);
  const landscapeItems = useMemo(() => videoItems.filter((x) => !x.isShort), [videoItems]);
  const productItems = useMemo(() => filtered, [filtered]);
  const showVideoSection = !isPageMode && (mediaTab === "all" || mediaTab === "media" || mediaTab === "groupbuy");
  const adItem = showVideoSection ? filtered[0] : null;
  const openShorts = useCallback((item, index) => {
    const i = shortsItems.findIndex((x) => x.id === item.id);
    setShortsStartIndex(i >= 0 ? i : index);
    setShortsOpen(true);
  }, [shortsItems]);

  useEffect(() => {
    onShortsFullscreenChange?.(shortsOpen);
  }, [shortsOpen, onShortsFullscreenChange]);

  if (storeProfileId) {
    return (
      <StoreProfileHome
        storeId={storeProfileId}
        onBack={() => setStoreProfileId(null)}
        onToast={onToast}
        isDarkMode={isDarkMode}
        isGuestMode={isGuestMode}
        onRequireAuth={onRequireAuth}
      />
    );
  }

  return (
    <div className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${theme.shell}`}>
      <div className={`sticky top-0 z-10 min-w-0 shrink-0 border-b ${theme.bar} backdrop-blur-md`}>
        <SwipeableChipTabs tabs={MEDIA_FEED_TABS} activeId={mediaTab} onChange={onChangeMediaTab} theme={theme} />
        <div className={`border-t px-3 py-2 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
          <div
            ref={searchBarRef}
            className={`flex items-center overflow-hidden rounded-xl border ${theme.searchWrap}`}
          >
            <button
              ref={categoryTriggerRef}
              type="button"
              onClick={() => setCategoryOpen((v) => !v)}
              aria-expanded={categoryOpen}
              aria-haspopup="true"
              aria-label={`카테고리: ${category}`}
              className={`flex h-10 shrink-0 items-center gap-1 border-r px-3 text-[13px] font-bold transition ${
                categoryOpen
                  ? "border-[#2d5ce6] bg-[#346aff] text-white"
                  : isDarkMode
                    ? `border-white/10 ${theme.searchCatBtn}`
                    : `border-slate-200 ${theme.searchCatBtn}`
              }`}
            >
              <span className="max-w-[92px] truncate">{category}</span>
              <span
                className={`shrink-0 text-[10px] transition ${categoryOpen ? "rotate-180 text-white/90" : theme.meta}`}
              >
                ▾
              </span>
            </button>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="찾고 싶은 상품을 검색해보세요!"
              className={`h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-[13px] outline-none ${theme.searchInput}`}
            />
            <div className="flex items-center gap-1 px-2">
              <button type="button" className={`grid h-7 w-7 place-items-center rounded-full ${theme.searchIcon}`} aria-label="음성 검색">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <path d="M12 17v4" />
                </svg>
              </button>
              <button type="button" className={`grid h-7 w-7 place-items-center rounded-full ${theme.searchIconAccent}`} aria-label="검색">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CategoryPickerOverlay
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        anchorRef={categoryTriggerRef}
        alignRef={searchBarRef}
        value={category}
        onChange={setCategorySafe}
        options={SHOPPING_CATEGORIES}
        theme={theme}
        isDarkMode={isDarkMode}
      />

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pt-2"
        style={{ paddingBottom: FEED_SCROLL_BOTTOM_PAD }}
      >
        {loading && items.length === 0 ? (
          <p className={`py-20 text-center text-[13px] ${theme.meta}`}>불러오는 중…</p>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <p className={`py-20 text-center text-[13px] ${theme.meta}`}>검색 조건에 맞는 콘텐츠가 없습니다.</p>
        ) : null}

        {showVideoSection ? (
          <>
            <p className={`mb-2 text-[12px] font-black ${theme.sectionTitle}`}>광고</p>
            <AdBannerSlot item={adItem} onOpenStore={openStore} theme={theme} />
            {shortsItems.length > 0 ? (
              <ShortsCarousel items={shortsItems} onOpenItem={openShorts} />
            ) : null}
            {landscapeItems.length > 0 ? (
              <>
                <p className={`mb-2 mt-1 text-[12px] font-black ${theme.sectionTitle}`}>가로 영상</p>
                <div className={theme.divide}>
                  {landscapeItems.map((item) => (
                    <FeedListRow
                      key={`${mediaTab}-${item.id}`}
                      item={item}
                      theme={theme}
                      onOpen={openItemDetail}
                      onOpenStore={openStore}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {isPageMode ? (
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            {productItems.map((item) => (
              <PageProductCard
                key={`page-${item.id}`}
                item={item}
                onCheckout={() =>
                  guardGuestAction(() => onToast?.(`${item.product?.title || feedDisplayTitle(item)} 결제 준비`))
                }
              />
            ))}
          </div>
        ) : (
          <>
            <p className={`mb-2 mt-4 text-[12px] font-black ${theme.sectionTitle}`}>상품 피드</p>
            <div className="space-y-2 pb-2">
              {productItems.map((item) => (
                <ProductRow key={`product-${item.id}`} item={item} onOpenStore={openStore} />
              ))}
            </div>
          </>
        )}

        <div ref={sentinelRef} className="h-12 w-full" />
      </div>

      <button
        type="button"
        onClick={() => guardGuestAction(() => setOwnerOpen(true))}
        className="fixed right-4 z-[90] flex h-11 w-11 items-center justify-center rounded-full border border-blue-500 bg-blue-600 text-[24px] font-light text-white shadow-md"
        style={{ bottom: FEED_SCROLL_BOTTOM_PAD }}
        aria-label="AI 소싱"
      >
        +
      </button>

      {!isPageMode ? (
        <MediaCommercePlayerSheet
          item={selected}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          onToast={onToast}
          isDarkMode={false}
          onOpenStore={openStore}
          isGuestMode={isGuestMode}
          onRequireAuth={onRequireAuth}
        />
      ) : null}

      {shortsOpen ? (
        <div className="fixed inset-0 z-[200] bg-black">
          <MediaCommerceShortsPlayer
            key={shortsStartIndex}
            items={shortsItems}
            initialIndex={shortsStartIndex}
            onBack={() => setShortsOpen(false)}
            onToast={onToast}
            onOpenStore={openStore}
            isDarkMode={false}
            isGuestMode={isGuestMode}
            onRequireAuth={onRequireAuth}
          />
        </div>
      ) : null}

      {ownerOpen ? (
        <div className="fixed inset-0 z-[180] flex flex-col bg-white">
          <AiSourcingUploadScreen onBack={() => setOwnerOpen(false)} onToast={onToast} isDarkMode={isDarkMode} />
        </div>
      ) : null}
    </div>
  );
}
