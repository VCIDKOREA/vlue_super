import { useEffect, useMemo, useState } from "react";
import { feedDisplayTitle } from "../../lib/mediaCommerceCatalog.js";
import { enrichFeedBatch } from "../../lib/mediaCommerceFeedService.js";
import { getStoreProfile, isFavoriteStore, toggleFavoriteStore } from "../../lib/mediaCommerceStores.js";
import { feedTheme } from "../../lib/mediaCommerceTheme.js";
import MediaCommercePlayerSheet from "./MediaCommercePlayerSheet.jsx";
import FeedThumbImage from "./FeedThumbImage.jsx";
import SwipeableChipTabs from "./SwipeableChipTabs.jsx";
import ScreenBackHeader from "../common/ScreenBackHeader";
import { SHOPPING_CATEGORIES, inferShoppingCategory } from "../../lib/shoppingCategories.js";

const MEDIA_PROFILE_TABS = [
  { id: "archive", label: "라이브/쇼츠 아카이브" },
  { id: "catalog", label: "상품 목록/카탈로그" }
];
const PAGE_PROFILE_TABS = [{ id: "catalog", label: "상품 목록/카탈로그" }];
const VIDEO_FILTER_TABS = [
  { id: "all", label: "전체" },
  { id: "live", label: "라이브" },
  { id: "short", label: "숏츠" },
  { id: "vod", label: "다시보기" }
];

function filterProfileItems(items, tabId) {
  if (tabId === "live") return items.filter((x) => x.isLive);
  if (tabId === "short") return items.filter((x) => x.isShort);
  if (tabId === "vod") return items.filter((x) => !x.isLive && !x.isShort);
  return items;
}

export default function StoreProfileHome({ storeId, onBack, onToast, isDarkMode = false }) {
  const [profile, setProfile] = useState(() => getStoreProfile(storeId));
  const [items, setItems] = useState([]);
  const [profileTab, setProfileTab] = useState("archive");
  const [videoFilterTab, setVideoFilterTab] = useState("all");
  const [fav, setFav] = useState(() => isFavoriteStore(storeId));
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const t = feedTheme(false);

  useEffect(() => {
    const p = getStoreProfile(storeId);
    setProfile(p);
    if (!p) return;
    setProfileTab(p.shopMode === "PAGE" ? "catalog" : "archive");
    enrichFeedBatch(p.items).then(setItems);
  }, [storeId]);

  const filteredVideos = useMemo(() => filterProfileItems(items, videoFilterTab), [items, videoFilterTab]);
  const isPageStore = profile?.shopMode === "PAGE";

  const catalogItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => (isPageStore ? !item.youtubeVideoId && !item.isLive && !item.isShort : true))
      .filter((item) => {
        const haystack = `${feedDisplayTitle(item)} ${item.channelName || ""} ${item.product?.title || ""}`.toLowerCase();
        if (category !== "전체" && inferShoppingCategory(item) !== category) return false;
        if (!q) return true;
        return haystack.includes(q);
      });
  }, [items, query, category, isPageStore]);
  const modeTabs = isPageStore ? PAGE_PROFILE_TABS : MEDIA_PROFILE_TABS;

  if (!profile) {
    return (
      <div className={`flex flex-1 flex-col ${t.shell}`}>
        <ScreenBackHeader title="상점" onBack={onBack} isDarkMode={isDarkMode} />
        <p className="px-3 py-8 text-center text-[13px]">상점을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${t.shell}`}>
      <ScreenBackHeader
        title={profile.channelName}
        onBack={onBack}
        isDarkMode={isDarkMode}
        right={
          <button
            type="button"
            onClick={() => {
              toggleFavoriteStore(storeId);
              setFav((v) => !v);
            }}
            className={`rounded-lg px-2 py-1 text-[12px] font-bold ${fav ? "text-rose-600" : "text-slate-500"}`}
          >
            {fav ? "♥" : "♡"}
          </button>
        }
      />
      <div className={`shrink-0 border-b ${t.bar}`}>
        <p className={`px-3 py-2 text-[11px] ${t.meta}`}>
          {isPageStore ? `상품 ${catalogItems.length}` : `영상 ${profile.itemCount} · 라이브 ${profile.liveCount}`}
        </p>
        {modeTabs.length > 1 ? (
          <SwipeableChipTabs tabs={modeTabs} activeId={profileTab} onChange={setProfileTab} theme={t} />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 pb-28">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-[22px] font-black text-white">
            {(profile.channelName || "?").slice(0, 1)}
          </div>
          <p className={`text-[12px] leading-relaxed ${t.sub}`}>
            {profile.shopMode === "PAGE"
              ? "페이지 쇼핑 모드: 상품 목록/카테고리 중심으로 노출됩니다."
              : "미디어 쇼핑 모드: 라이브/숏츠 아카이브가 먼저 노출됩니다."}
          </p>
        </div>

        {profileTab === "archive" ? (
          <>
            <SwipeableChipTabs tabs={VIDEO_FILTER_TABS} activeId={videoFilterTab} onChange={setVideoFilterTab} theme={t} />
            {filteredVideos.length === 0 ? (
              <p className={`py-12 text-center text-[13px] ${t.meta}`}>이 카테고리에 영상이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 pt-2">
                {filteredVideos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`relative aspect-square overflow-hidden rounded-lg ${t.thumbBg}`}
                  >
                    <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
                    {item.isLive ? (
                      <span className="absolute left-1 top-1 rounded bg-red-600 px-1 text-[8px] font-black text-white">LIVE</span>
                    ) : null}
                    <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-1.5 text-[9px] font-bold leading-tight text-white line-clamp-2">
                      {feedDisplayTitle(item)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center overflow-hidden rounded-lg border border-blue-500 bg-white">
              <button
                type="button"
                onClick={() => setCategoryOpen((v) => !v)}
                className="flex h-10 min-w-[84px] items-center justify-between gap-1 border-r border-slate-200 px-3 text-[13px] font-semibold text-slate-900"
              >
                {category}
                <span className="text-slate-500">▾</span>
              </button>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="찾고 싶은 상품을 검색해보세요!"
                className="h-10 min-w-0 flex-1 border-0 px-3 text-[13px] text-slate-900 outline-none"
              />
              <div className="px-3 text-slate-400">🔍</div>
            </div>
            {categoryOpen ? (
              <div className="mb-2 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-md">
                {SHOPPING_CATEGORIES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setCategory(name);
                      setCategoryOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-[13px] text-slate-800 hover:bg-slate-50"
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className={isPageStore ? "grid grid-cols-2 gap-2.5" : "space-y-2"}>
              {catalogItems.map((item) => {
                const title = item.product?.title || feedDisplayTitle(item);
                const price = Number(item.product?.priceKrw || 0);
                const img = item.product?.imageUrl || item.thumbUrl || "";
                if (isPageStore) {
                  return (
                    <article key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="aspect-square bg-slate-100">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-[12px] font-semibold text-slate-900">{title}</p>
                        <p className="mt-1 text-[14px] font-black text-slate-900">
                          {price > 0 ? `${price.toLocaleString()}원` : "가격 문의"}
                        </p>
                        <button
                          type="button"
                          onClick={() => onToast?.(`${title} 결제 준비`)}
                          className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-[11px] font-black text-white"
                        >
                          바로결제
                        </button>
                      </div>
                    </article>
                  );
                }
                return (
                  <article key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {price > 0 ? `${price.toLocaleString()}원` : "가격 문의"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {!isPageStore ? (
        <MediaCommercePlayerSheet
          item={selected}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          onToast={onToast}
          isDarkMode={false}
          onOpenStore={() => {}}
        />
      ) : null}
    </div>
  );
}
