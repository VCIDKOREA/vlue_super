import { useEffect, useRef, useState } from "react";
import GiftBoxPanel from "./GiftBoxPanel.jsx";
import StoreShoppingCartPanel from "./StoreShoppingCartPanel.jsx";
import VlueStoreNoticeModal from "./VlueStoreNoticeModal.jsx";
import MediaCommerceFeed from "./shopping/MediaCommerceFeed.jsx";
import PartnershipVaultScreen from "./shopping/PartnershipVaultScreen.jsx";
import { MEDIA_FEED_TABS, LEGACY_TAB_MAP } from "../lib/mediaCommerceCatalog.js";
import { countAvailableGifts, readGiftBox } from "../lib/giftBoxStorage.js";
import { countCartItems, SHOPPING_CART_CHANGED } from "../lib/shoppingCartStorage.js";
import { dismissUntilToday, isDismissedUntilToday } from "../lib/dismissUntilToday.js";

const VLUE_STORE_NOTICE_DISMISS_KEY = "vlue_store_notice_dismiss_v1";

const MEDIA_TAB_IDS = new Set(MEDIA_FEED_TABS.map((t) => t.id));
const UTIL_TAB_IDS = new Set(["gifts", "chat", "cart"]);

function UtilScreen({ children, isDarkMode }) {
  const bg = isDarkMode ? "bg-[#0f0f0f] text-white" : "bg-[#f8fafc] text-slate-900";
  return <div className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-28 ${bg}`}>{children}</div>;
}

function Subscription({
  isDarkMode = false,
  activeSubTab = "all",
  onChangeSubTab,
  chatRooms = [],
  chatUnreadTotal = 0,
  onOpenChat,
  onFamilyAlertToast
}) {
  const [giftToast, setGiftToast] = useState("");
  const [giftAvailableCount, setGiftAvailableCount] = useState(() => countAvailableGifts(readGiftBox()));
  const [cartItemCount, setCartItemCount] = useState(() => countCartItems());
  const [storeNoticeOpen, setStoreNoticeOpen] = useState(false);
  const [shortsFullscreen, setShortsFullscreen] = useState(false);
  const storeNoticeSessionClosedRef = useRef(false);

  const resolvedTab = LEGACY_TAB_MAP[activeSubTab] || activeSubTab;
  const mediaTab = MEDIA_TAB_IDS.has(resolvedTab) ? resolvedTab : "all";
  const showMediaFeed = MEDIA_TAB_IDS.has(resolvedTab) || activeSubTab in LEGACY_TAB_MAP;
  const showUtil = UTIL_TAB_IDS.has(activeSubTab);

  useEffect(() => {
    if (LEGACY_TAB_MAP[activeSubTab] && onChangeSubTab) {
      onChangeSubTab(LEGACY_TAB_MAP[activeSubTab]);
    }
  }, [activeSubTab, onChangeSubTab]);

  useEffect(() => {
    if (activeSubTab === "gifts") return;
    if (storeNoticeSessionClosedRef.current) return;
    if (isDismissedUntilToday(VLUE_STORE_NOTICE_DISMISS_KEY)) return;
    setStoreNoticeOpen(true);
  }, [activeSubTab]);

  useEffect(() => {
    const syncGifts = () => setGiftAvailableCount(countAvailableGifts(readGiftBox()));
    syncGifts();
    window.addEventListener("vlue-gift-box-changed", syncGifts);
    return () => window.removeEventListener("vlue-gift-box-changed", syncGifts);
  }, []);

  useEffect(() => {
    const syncCart = () => setCartItemCount(countCartItems());
    syncCart();
    window.addEventListener(SHOPPING_CART_CHANGED, syncCart);
    return () => window.removeEventListener(SHOPPING_CART_CHANGED, syncCart);
  }, []);

  const showGiftToast = (msg) => {
    setGiftToast(msg);
    setTimeout(() => setGiftToast(""), 2400);
  };

  const subPanel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-slate-200 bg-white";
  const textStrong = isDarkMode ? "text-gray-100" : "text-slate-900";

  const utilBar = (
    <nav
      className={`vlue-tab-strip shrink-0 overflow-x-auto border-b px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        isDarkMode ? "border-white/10 bg-[#0f0f0f]" : "border-slate-200 bg-white"
      }`}
    >
      {[
        { id: "gifts", label: "선물함", badge: giftAvailableCount },
        { id: "chat", label: "채팅문의", badge: chatUnreadTotal },
        { id: "cart", label: "쇼핑보관함", badge: cartItemCount }
      ].map((tab) => {
        const active = activeSubTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeSubTab?.(tab.id)}
            className={`relative shrink-0 rounded-full font-black transition ${
              active ? "bg-blue-600 text-white shadow-sm" : isDarkMode ? "bg-white/10 text-gray-300" : "bg-slate-100 text-slate-600"
            }`}
          >
            {tab.label}
            {tab.badge > 0 ? (
              <span
                className={`vlue-tab-strip__badge absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 font-black ${
                  active ? "bg-white text-blue-600" : "bg-rose-500 text-white"
                }`}
              >
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  return (
    <section
      className={`mx-auto flex h-full min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden ${
        isDarkMode ? "bg-[#0f0f0f]" : "bg-[#f8fafc]"
      }`}
    >
      {showMediaFeed ? (
        <MediaCommerceFeed
          mediaTab={mediaTab}
          onChangeMediaTab={onChangeSubTab}
          onToast={showGiftToast}
          onShortsFullscreenChange={setShortsFullscreen}
          isDarkMode={isDarkMode}
        />
      ) : null}

      {showUtil ? utilBar : null}

      {showUtil && activeSubTab === "gifts" ? (
        <UtilScreen isDarkMode={isDarkMode}>
          <GiftBoxPanel isDarkMode={isDarkMode} onToast={showGiftToast} />
        </UtilScreen>
      ) : null}

      {showUtil && activeSubTab === "cart" ? (
        <UtilScreen isDarkMode={isDarkMode}>
          <PartnershipVaultScreen compact onToast={showGiftToast} isDarkMode={isDarkMode} />
          <details className={`mt-3 rounded-2xl border px-3 py-2 ${subPanel}`}>
            <summary className={`cursor-pointer text-[12px] font-bold ${textStrong}`}>레거시 장바구니</summary>
            <StoreShoppingCartPanel onToast={showGiftToast} />
          </details>
        </UtilScreen>
      ) : null}

      {showUtil && activeSubTab === "chat" ? (
        <UtilScreen isDarkMode={isDarkMode}>
          <div className={`space-y-1 rounded-2xl border px-2 py-2 ${subPanel}`}>
            {chatRooms.map((room) => (
              <button
                key={room.roomId}
                type="button"
                onClick={() => onOpenChat?.(room.roomId)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left active:bg-slate-50"
              >
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500" />
                <div className="min-w-0 flex-1">
                  <span className="truncate text-[14px] font-bold">{room.name}</span>
                  <p className="truncate text-[12px] text-slate-500">{room.lastMsg}</p>
                </div>
              </button>
            ))}
            {chatRooms.length === 0 && <p className="py-8 text-center text-[12px] text-slate-500">채팅이 없습니다.</p>}
          </div>
        </UtilScreen>
      ) : null}

      {giftToast ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-[12px] font-bold text-white shadow-lg">
          {giftToast}
        </div>
      ) : null}

      <VlueStoreNoticeModal
        open={storeNoticeOpen && !shortsFullscreen}
        onClose={() => {
          storeNoticeSessionClosedRef.current = true;
          setStoreNoticeOpen(false);
        }}
        onDismissToday={() => {
          dismissUntilToday(VLUE_STORE_NOTICE_DISMISS_KEY);
          storeNoticeSessionClosedRef.current = true;
          setStoreNoticeOpen(false);
        }}
      />
    </section>
  );
}

export default Subscription;
