import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Loader,
  RefreshCw,
  Smartphone,
  Play,
  Radio,
  LayoutGrid,
  FileImage,
  Users,
} from 'lucide-react';
import FeedThumbImage from '../../../components/shopping/FeedThumbImage.jsx';
import MediaCommercePlayerSheet from '../../../components/shopping/MediaCommercePlayerSheet.jsx';
import StoreProfileHome from '../../../components/shopping/StoreProfileHome.jsx';
import AiRecommendCarousel from '../../../components/shopping/AiRecommendCarousel.jsx';
import ChannelProfileLink from '../../../components/shopping/ChannelProfileLink.jsx';
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
import './marketing-store.css';

const STORE_TABS = MEDIA_FEED_TABS.filter((t) =>
  ['all', 'media', 'page', 'groupbuy'].includes(t.id)
);

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
  const theme = feedTheme(false);
  const [mediaTab, setMediaTab] = useState('all');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [storeProfileId, setStoreProfileId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('전체');
  const [toast, setToast] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const isPageMode = mediaTab === 'page';

  const onToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 4000);
  }, []);

  const openStore = useCallback((id: string) => setStoreProfileId(id), []);

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
    return LayoutGrid;
  };

  return (
    <div className="mkt-store">
      {toast ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="mkt-store__tabs">
          {STORE_TABS.map((tab) => {
            const Icon = tabIcon(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMediaTab(tab.id)}
                className={`mkt-store__tab inline-flex items-center gap-1.5 ${mediaTab === tab.id ? 'is-active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <span className="mkt-store__sync">
          <RefreshCw className="w-3 h-3" />
          앱 VLUE 스토어와 동일 피드
        </span>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="찾고 싶은 상품·채널을 검색해보세요"
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setQuery('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700">
          검색
        </button>
      </form>

      <div className="mb-4 flex items-center gap-1 overflow-x-auto hide-scrollbar pb-1">
        {SHOPPING_CATEGORIES.slice(0, 10).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(normalizeShoppingCategory(cat))}
            className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-colors ${
              category === cat ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {!isPageMode ? (
        <AiRecommendCarousel
          variant="strip"
          theme={theme}
          onOpen={(item: FeedItem) => setSelected(item)}
          onOpenStore={openStore}
          isDarkMode={false}
        />
      ) : null}

      {!user && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Smartphone className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-900 flex-1" style={{ wordBreak: 'keep-all' }}>
            결제·블루페이·주문 알림은 <strong>모바일 앱</strong>과 동일합니다. 웹에서는 피드 열람·상세 확인, 앱에서 구매를 이어갑니다.
          </p>
          {onLoginClick ? (
            <button type="button" onClick={onLoginClick} className="shrink-0 text-xs font-bold text-amber-800 underline">
              로그인
            </button>
          ) : null}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-sm text-slate-500">
          <p className="font-bold text-slate-700 mb-1">표시할 게시물이 없습니다</p>
          <p className="text-xs">다른 탭·카테고리 또는 검색어를 바꿔 보세요.</p>
        </div>
      ) : isPageMode ? (
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
      ) : (
        <>
          {featured ? (
            <div className="mkt-store__hero mb-6">
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
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-center">
                <p className="text-xs font-black text-primary-600 mb-2 uppercase tracking-wide">미디어 · 페이지 · 공구</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3" style={{ wordBreak: 'keep-all' }}>
                  앱 <strong>VLUE 스토어</strong>와 같은 게시물입니다. 미디어쇼핑(영상·라이브), 페이지쇼핑(상점 카탈로그), 공동구매(라이브·공구)를 웹에서 넓은 화면으로 탐색하세요.
                </p>
                <ul className="text-xs text-slate-500 space-y-1.5">
                  <li>· 미디어쇼핑 — YouTube·TikTok·Reels 연동 소싱</li>
                  <li>· 페이지쇼핑 — 자료실·상점 등록 상품 (API 동기화)</li>
                  <li>· 공동구매 — 라이브·공구 마감 타이머 (앱 결제)</li>
                </ul>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gridItems.map((item) => (
              <WebVideoCard key={item.id} item={item} onOpen={setSelected} onOpenStore={openStore} />
            ))}
          </div>
        </>
      )}

      <div ref={sentinelRef} className="mkt-store__sentinel" aria-hidden />
      {loading && items.length > 0 ? (
        <p className="text-center text-xs text-slate-400 py-4">더 불러오는 중…</p>
      ) : null}

      <MediaCommercePlayerSheet
        item={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onToast={onToast}
        isDarkMode={false}
        onOpenStore={openStore}
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
    </div>
  );
}
