import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSellerVodProducts, mapSellerVodToFeedItem } from "../../lib/sellerVodApi.js";
import LiveCommerceShell from "./LiveCommerceShell.jsx";
import CommerceSideRail from "./CommerceSideRail.jsx";
import ChannelProfileLink from "./ChannelProfileLink.jsx";
import BackButton from "../common/BackButton";

/** 개인 상점 [지난 라이브 특가] — 인스타 피드형 위아래 스와이프 */
export default function SellerVodSwipeFeed({
  sellerUserId,
  storeProfile,
  onBack,
  onToast,
  onOpenStore,
  isGuestMode = false,
  onRequireAuth
}) {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const item = items[index];

  useEffect(() => {
    if (!sellerUserId) return;
    fetchSellerVodProducts(sellerUserId)
      .then((rows) => setItems(rows.map((v) => mapSellerVodToFeedItem(v, storeProfile))))
      .catch(() => setItems([]));
  }, [sellerUserId, storeProfile]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !items.length) return;
    const h = el.clientHeight;
    if (!h) return;
    const i = Math.round(el.scrollTop / h);
    if (i !== index && i >= 0 && i < items.length) setIndex(i);
  }, [index, items.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return (
    <div className="relative flex h-[100dvh] flex-col bg-black">
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center gap-2 px-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <BackButton variant="overlay" onBack={onBack} />
        <span className="text-[12px] font-bold text-white/90">지난 라이브 특가</span>
        <span className="ml-auto text-[12px] font-bold text-white/80 tabular-nums">
          {items.length ? `${index + 1} / ${items.length}` : ""}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-scroll overscroll-y-contain"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {items.map((row, i) => (
          <section
            key={row.id}
            className="relative flex h-[100dvh] w-full shrink-0 snap-start snap-always flex-col"
          >
            {i === index ? (
              <LiveCommerceShell
                videoUrl={row.videoUrl}
                title={row.product?.title}
                isLive={false}
                commerceRail={
                  <CommerceSideRail
                    item={row}
                    onToast={onToast}
                    onOpenStore={onOpenStore}
                    compact={row.aspectRatio === "9:16"}
                    isGuestMode={isGuestMode}
                    onRequireAuth={onRequireAuth}
                  />
                }
              />
            ) : (
              <div className="h-full w-full bg-neutral-900">
                {row.thumbUrl ? (
                  <img src={row.thumbUrl} alt="" className="h-full w-full object-cover opacity-60" />
                ) : null}
              </div>
            )}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <p className="line-clamp-2 text-[15px] font-bold text-white">{row.product?.title}</p>
              <div className="pointer-events-auto mt-2">
                <ChannelProfileLink item={row} onOpenStore={onOpenStore} isDarkMode />
              </div>
            </div>
          </section>
        ))}
        {!items.length ? (
          <p className="flex h-[50vh] items-center justify-center text-[13px] text-white/60">
            아직 지난 라이브 VOD가 없습니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}
