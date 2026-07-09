import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Loader,
  RefreshCw,
  Play,
  Radio,
  LayoutGrid,
  FileImage,
  Users,
  CreditCard,
  Gavel,
  Plus,
} from 'lucide-react';
import FeedThumbImage from '../../../components/shopping/FeedThumbImage.jsx';
import MediaCommercePlayerSheet from '../../../components/shopping/MediaCommercePlayerSheet.jsx';
import StoreProfileHome from '../../../components/shopping/StoreProfileHome.jsx';
import AiRecommendCarousel from '../../../components/shopping/AiRecommendCarousel.jsx';
import ShoppingCategoryDropdown from '../../../components/shopping/ShoppingCategoryDropdown.jsx';
import ChannelProfileLink from '../../../components/shopping/ChannelProfileLink.jsx';
import AiSourcingUploadScreen from '../../../components/shopping/AiSourcingUploadScreen.jsx';
import AuctionListSection from '../../../components/auction/AuctionListSection.jsx';
import AuctionDetailSheet from '../../../components/auction/AuctionDetailSheet.jsx';
import {
  MEDIA_FEED_TABS,
  feedDisplayTitle,
  feedMetaLine,
  mediaPlatformBadge,
} from '../../../lib/mediaCommerceCatalog.js';
import {
  enrichFeedBatch,
  getFeedPage,
  getFeedPageAsync,
  invalidatePageFeedCache,
} from '../../../lib/mediaCommerceFeedService.js';
import { feedTheme } from '../../../lib/mediaCommerceTheme.js';
import { SHOPPING_CATEGORIES, inferShoppingCategory, normalizeShoppingCategory } from '../../../lib/shoppingCategories.js';
import { VAULT_CHANGED } from '../../../lib/shoppingCoreStorage.js';
import {
  readStoreFeedTab,
  writeStoreFeedTab,
  readStoreFeedCategory,
  writeStoreFeedCategory,
  STORE_FEED_PREFS_CHANGED,
} from '../../../lib/storeFeedPrefs.js';
import { consumePendingVlueStoreId } from '../../../lib/vluePartnerStoreNav.js';
import { STORE_UPLOAD_OPEN } from '../../../lib/storeUploadBridge.js';
import { useHorizontalDragScroll } from '../../../hooks/useHorizontalDragScroll.js';
import './marketing-store.css';

const STORE_TABS = MEDIA_FEED_TABS.filter((t) =>
  ['all', 'page', 'groupbuy', 'auction'].includes(t.id)
);

const TAB_SHORT_LABEL: Record<string, string> = {
  all: '전체',
  page: '페이지',
  groupbuy: '공구',
  auction: '경매',
};

type FeedItem = {
  id: string;
  storeId?: string;
  channelName?: string;
  isLive?: boolean;
  isShort?: boolean;
  durationLabel?: string;
  youtubeVideoId?: string;
  mediaPlatform?: string;
  thumbUrl?: string;
  overlayCaption?: string;
  commerceChannel?: string;
  sourceUrl?: string;
  product?: {
    title?: string;
    priceKrw?: number;
    imageUrl?: string;
    platform?: string;
  };
};

function DurationBadge({ label, isLive }: { label?: string; isLive?: boolean }) {
  if (isLive) {
    return <span className="mkt-store__duration">LIVE</span>;
  }
  if (!label) return null;
  return <span className="mkt-store__duration">{label}</span>;
}

function ThumbBadges({ item }: { item: FeedItem }) {
  const badge = mediaPlatformBadge(item.mediaPlatform);
  return (
    <div className="absolute left-2 top-2 flex flex-wrap gap-1 z-[1]">
      {item.isLive ? (
        <span className="mkt-store__badge-live">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      ) : null}
      {!item.isLive && item.mediaPlatform ? (
        <span className={`mkt-store__badge-platform ${badge.className}`}>{badge.label}</span>
      ) : null}
    </div>
  );
}

function WebVideoCard({
  item,
  onOpen,
  onOpenStore,
}: {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
  onOpenStore: (id: string) => void;
}) {
  const title = feedDisplayTitle(item);
  const price = Number(item.product?.priceKrw || 0);

  return (
    <article className="mkt-store__card">
      <button type="button" className="w-full" onClick={() => onOpen(item)}>
        <div className="mkt-store__thumb">
          <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
          <ThumbBadges item={item} />
          <DurationBadge label={item.durationLabel} isLive={item.isLive} />
          <div className="mkt-store__play">
            <span>
              <Play className="w-7 h-7 ml-0.5 fill-current" />
            </span>
          </div>
        </div>
      </button>
      <div className="mkt-store__body">
        <h3 className="mkt-store__title">{title}</h3>
        <p className="mkt-store__meta">{feedMetaLine(item)}</p>
        {price > 0 ? <p className="mkt-store__price">{price.toLocaleString('ko-KR')}원</p> : null}
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <ChannelProfileLink item={item} onOpenStore={onOpenStore} isDarkMode={false} layout="row" />
        </div>
      </div>
    </article>
  );
}

function WebPageCard({
  item,
  onOpen,
  onLogin,
}: {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
  onLogin?: () => void;
}) {
  const title = item.product?.title || feedDisplayTitle(item);
  const price = Number(item.product?.priceKrw || 0);

  return (
    <article className="mkt-store__card flex flex-col h-full">
      <button type="button" className="w-full flex-1 flex flex-col" onClick={() => onOpen(item)}>
        <div className="mkt-store__thumb mkt-store__thumb--square">
          <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
          <span className="absolute left-2 top-2 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-black text-white">
            페이지쇼핑
          </span>
        </div>
        <div className="mkt-store__body flex-1 flex flex-col">
          <h3 className="mkt-store__title">{title}</h3>
          <p className="mkt-store__meta">{item.channelName || '페이지 쇼핑'}</p>
          <p className="mkt-store__price mt-auto">{price > 0 ? `${price.toLocaleString('ko-KR')}원` : '가격 문의'}</p>
        </div>
      </button>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => (onLogin ? onLogin() : onOpen(item))}
          className="w-full py-2 rounded-xl bg-primary-600 text-white text-xs font-black hover:bg-primary-700"
        >
          상세 · 결제
        </button>
      </div>
    </article>
  );
}

interface Props {
  user?: { email: string } | null;
  onLoginClick?: () => void;
}

export default function MarketingMediaCommerceStore({ user, onLoginClick }: Props) {
  const { scrollerRef, scrollerProps, guardClick } = useHorizontalDragScroll();
  const theme = feedTheme(false);
  const [mediaTab, setMediaTab] = useState(() => readStoreFeedTab('all'));
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [storeProfileId, setStoreProfileId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState(() => readStoreFeedCategory('전체'));
  const [toast, setToast] = useState('');
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [auctionSelectedId, setAuctionSelectedId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const isPageMode = mediaTab === 'page';
  const isAuctionMode = mediaTab === 'auction';

  const onToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 4000);
  }, []);

  const openStore = useCallback((id: string) => setStoreProfileId(id), []);

  useEffect(() => {
    const pending = consumePendingVlueStoreId();
    if (pending) setStoreProfileId(pending);
  }, []);

  const loadFeedPage = useCallback(
    async (nextPage: number, replace = false) => {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoading(true);
      try {
        const { items: slice, hasMore: more } = isPageMode
          ? await getFeedPageAsync(mediaTab, nextPage)
          : getFeedPage(mediaTab, nextPage);
        const enriched = (isPageMode ? slice : await enrichFeedBatch(slice)) as FeedItem[];
        setItems((prev) => (replace ? enriched : [...prev, ...enriched]));
        setHasMore(more);
        setPage(nextPage);
      } catch (e) {
        onToast(e instanceof Error ? e.message : '피드를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
        loadingMoreRef.current = false;
      }
    },
    [mediaTab, isPageMode, onToast]
  );

  useEffect(() => {
    const onPrefs = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; category?: string }>).detail || {};
      if (detail.tab) setMediaTab(detail.tab);
      if (detail.category) setCategory(detail.category);
    };
    window.addEventListener(STORE_FEED_PREFS_CHANGED, onPrefs);
    return () => window.removeEventListener(STORE_FEED_PREFS_CHANGED, onPrefs);
  }, []);

  const changeMediaTab = useCallback((tabId: string) => {
    setMediaTab(tabId);
    writeStoreFeedTab(tabId);
  }, []);

  const changeCategory = useCallback((cat: string) => {
    const next = normalizeShoppingCategory(cat);
    setCategory(next);
    writeStoreFeedCategory(next);
  }, []);

  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    loadFeedPage(0, true);
  }, [mediaTab, loadFeedPage]);

  useEffect(() => {
    if (!isPageMode) return undefined;
    const onVault = () => {
      invalidatePageFeedCache();
      loadFeedPage(0, true);
    };
    window.addEventListener(VAULT_CHANGED, onVault);
    return () => window.removeEventListener(VAULT_CHANGED, onVault);
  }, [isPageMode, loadFeedPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadFeedPage(page + 1, false);
      },
      { rootMargin: '240px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadFeedPage, page]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const inferred = inferShoppingCategory(item);
      if (category !== '전체' && inferred !== category) return false;
      if (!q) return true;
      const haystack = `${feedDisplayTitle(item)} ${item.channelName || ''} ${item.product?.title || ''} ${item.sourceUrl || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, category]);

  const featured = useMemo(() => {
    if (isPageMode) return null;
    return (
      filtered.find((x) => x.isLive) ||
      filtered.find((x) => x.youtubeVideoId || x.isShort) ||
      filtered[0] ||
      null
    );
  }, [filtered, isPageMode]);

  const gridItems = useMemo(() => {
    if (!featured || isPageMode) return filtered;
    return filtered.filter((x) => x.id !== featured.id);
  }, [filtered, featured, isPageMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  const tabIcon = (id: string) => {
    if (id === 'media') return Radio;
    if (id === 'page') return FileImage;
    if (id === 'groupbuy') return Users;
    if (id === 'auction') return Gavel;
    return LayoutGrid;
  };

  const openProductUpload = useCallback(() => {
    if (!user && onLoginClick) {
      onLoginClick();
      return;
    }
    setOwnerOpen(true);
  }, [user, onLoginClick]);

  useEffect(() => {
    const onUpload = () => openProductUpload();
    window.addEventListener(STORE_UPLOAD_OPEN, onUpload);
    return () => window.removeEventListener(STORE_UPLOAD_OPEN, onUpload);
  }, [openProductUpload]);

  const storeSearchForm = (className = 'mkt-store__search') => (
    <form onSubmit={handleSearch} className={className}>
      <div className="mkt-store__search-field">
        <Search className="mkt-store__search-icon" aria-hidden />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="상품·채널 검색"
          className="mkt-store__search-input"
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setQuery('');
            }}
            className="mkt-store__search-clear"
            aria-label="검색어 지우기"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      <button type="submit" className="mkt-store__search-btn">
        검색
      </button>
    </form>
  );

  const sidebarNav = (
    <>
      <nav className="mkt-store__sidebar-nav" role="tablist" aria-label="스토어 탭">
        {STORE_TABS.map((tab) => {
          const Icon = tabIcon(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mediaTab === tab.id}
              onClick={() => changeMediaTab(tab.id)}
              className={`mkt-store__sidebar-tab ${mediaTab === tab.id ? 'is-active' : ''}`}
            >
              <Icon className="mkt-store__sidebar-tab-icon" aria-hidden />
              <span className="mkt-store__sidebar-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mkt-store__sidebar-cats" role="tablist" aria-label="카테고리">
        <p className="mkt-store__sidebar-section">카테고리</p>
        {SHOPPING_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={category === cat}
            onClick={() => changeCategory(cat)}
            className={`mkt-store__sidebar-cat ${category === cat ? 'is-active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <p className="mkt-store__sidebar-sync">
        <RefreshCw className="w-3 h-3 shrink-0" aria-hidden />
        앱·웹 동일 피드
      </p>
    </>
  );

  return (
    <div className="mkt-store">
      <div className="mkt-store__topbar" role="region" aria-label="스토어 검색">
        <div className="mkt-store__topbar-center">
          {storeSearchForm('mkt-store__search mkt-store__search--top')}
          <button
            type="button"
            onClick={openProductUpload}
            className="mkt-store__upload-btn mkt-store__upload-btn--desktop"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden />
            상품 등록
          </button>
          <button
            type="button"
            onClick={() => {
              if (!user && onLoginClick) onLoginClick();
            }}
            className="mkt-store__bluepay"
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" aria-hidden />
            블루페이
          </button>
        </div>
      </div>

      <div className="mkt-store__layout">
        <aside className="mkt-store__sidebar" aria-label="VLUE 스토어 탐색">
          {sidebarNav}
        </aside>

        <div className="mkt-store__content-col">
        <div className="mkt-store__mobile-rail" aria-label="VLUE 스토어 필터 (모바일)">
          <div className="mkt-store__mobile-tabs-row">
            <div
              ref={scrollerRef}
              {...scrollerProps}
              className="mkt-store__mobile-tabs"
              role="tablist"
              aria-label="스토어 탭"
            >
              {STORE_TABS.map((tab) => {
                const Icon = tabIcon(tab.id);
                const active = mediaTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={guardClick(() => changeMediaTab(tab.id))}
                    className={`mkt-store__tab mkt-store__tab--mobile ${active ? 'is-active' : ''}`}
                  >
                    <Icon className="mkt-store__tab-icon" aria-hidden />
                    <span>{TAB_SHORT_LABEL[tab.id] || tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mkt-store__mobile-category-row">
            <ShoppingCategoryDropdown
              value={category}
              options={SHOPPING_CATEGORIES}
              onChange={changeCategory}
              className="mkt-store__category-dropdown--mobile-row"
            />
          </div>
        </div>

        <div className="mkt-store__main">
      <div className="mkt-store__feed pb-16">
      {toast ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {isAuctionMode ? (
        <AuctionListSection category={category} onSelect={(item) => setAuctionSelectedId(item.id)} />
      ) : null}

      {!isAuctionMode && !isPageMode ? (
        <AiRecommendCarousel
          variant="strip"
          theme={theme}
          onOpen={(item: FeedItem) => setSelected(item)}
          onOpenStore={openStore}
          isDarkMode={false}
        />
      ) : null}

      {!isAuctionMode && loading && items.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : null}

      {!isAuctionMode && !loading && filtered.length === 0 ? (
        <div className="text-center py-20 text-sm text-slate-500">
          <p className="font-bold text-slate-700 mb-1">표시할 게시물이 없습니다</p>
          <p className="text-xs">다른 탭·카테고리 또는 검색어를 바꿔 보세요.</p>
        </div>
      ) : null}

      {!isAuctionMode && isPageMode && filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <WebPageCard
              key={item.id}
              item={item}
              onOpen={(row) => {
                if (!user && onLoginClick) onLoginClick();
                else setSelected(row);
              }}
              onLogin={onLoginClick}
            />
          ))}
        </div>
      ) : null}

      {!isAuctionMode && !isPageMode && filtered.length > 0 ? (
        <>
          {featured ? (
            <div className="mkt-store__hero-compact mb-5">
              <button
                type="button"
                className="mkt-store__featured text-left"
                onClick={() => setSelected(featured)}
              >
                <FeedThumbImage item={featured} className="h-full w-full object-cover" alt="" />
                <ThumbBadges item={featured} />
                <DurationBadge label={featured.durationLabel} isLive={featured.isLive} />
                <div className="mkt-store__play">
                  <span>
                    <Play className="w-8 h-8 ml-1 fill-current" />
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white font-black text-lg leading-snug">{feedDisplayTitle(featured)}</p>
                  <p className="text-white/80 text-xs mt-1">{feedMetaLine(featured)}</p>
                </div>
              </button>
            </div>
          ) : null}
          <div className="mkt-store__video-grid">
            {gridItems.map((item) => (
              <WebVideoCard key={item.id} item={item} onOpen={setSelected} onOpenStore={openStore} />
            ))}
          </div>
        </>
      ) : null}

      <div ref={sentinelRef} className="mkt-store__sentinel" aria-hidden />
      {loading && items.length > 0 ? (
        <p className="text-center text-xs text-slate-400 py-4">더 불러오는 중…</p>
      ) : null}
      </div>
        </div>
        </div>
      </div>

      <MediaCommercePlayerSheet
        item={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onToast={onToast}
        isDarkMode={false}
        onOpenStore={openStore}
        onOpenRelated={setSelected}
      />

      {storeProfileId ? (
        <div className="mkt-store__profile-overlay">
          <StoreProfileHome
            storeId={storeProfileId}
            onBack={() => setStoreProfileId(null)}
            onToast={onToast}
            isDarkMode={false}
          />
        </div>
      ) : null}

      {ownerOpen ? (
        <div className="mkt-store__upload-overlay">
          <AiSourcingUploadScreen
            onBack={() => setOwnerOpen(false)}
            onToast={onToast}
            isDarkMode={false}
          />
        </div>
      ) : null}

      <AuctionDetailSheet
        auctionId={auctionSelectedId}
        open={Boolean(auctionSelectedId)}
        onClose={() => setAuctionSelectedId(null)}
        onToast={onToast}
        isLoggedIn={Boolean(user)}
      />
    </div>
  );
}
