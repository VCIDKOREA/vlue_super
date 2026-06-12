import { useCallback, useEffect, useRef, useState } from "react";
import { feedDisplayTitle, FEED_SCROLL_BOTTOM_PAD } from "../../lib/mediaCommerceCatalog.js";
import LiveCommerceShell from "./LiveCommerceShell.jsx";
import { enrichFeedBatch, getAllShortsItems } from "../../lib/mediaCommerceFeedService.js";
import CommerceSideRail from "./CommerceSideRail.jsx";
import ChannelProfileLink from "./ChannelProfileLink.jsx";
import BackButton from "../common/BackButton";

/** 세로 스냅 쇼츠 플레이어 — embedded 시 상단 탭 유지 */
export default function MediaCommerceShortsPlayer({
  embedded = false,
  items: itemsProp,
  initialIndex = 0,
  onBack,
  onToast,
  onOpenStore,
  isDarkMode = false,
  isGuestMode = false,
  onRequireAuth
}) {
  const [items, setItems] = useState(() => itemsProp || []);
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef(null);
  const item = items[index];

  useEffect(() => {
    if (itemsProp?.length) {
      setItems(itemsProp);
      return;
    }
    const raw = getAllShortsItems();
    enrichFeedBatch(raw).then((rows) => setItems(rows));
  }, [itemsProp]);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !items.length) return undefined;
    const frame = requestAnimationFrame(() => {
      const h = el.clientHeight;
      if (!h) return;
      const i = Math.min(Math.max(0, initialIndex), items.length - 1);
      el.scrollTop = i * h;
      setIndex(i);
    });
    return () => cancelAnimationFrame(frame);
  }, [items, initialIndex]);

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

  const slideMinH = embedded ? "min-h-full h-full" : "min-h-[100dvh] h-[100dvh]";

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col bg-black ${embedded ? "" : "h-[100dvh]"}`}>
      {!embedded ? (
        <div className="absolute left-0 right-0 top-0 z-30 flex items-center gap-2 px-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <BackButton variant="overlay" onBack={onBack} />
          <span className="ml-auto text-[12px] font-bold text-white/90 tabular-nums">
            {items.length ? `${index + 1} / ${items.length}` : ""}
          </span>
        </div>
      ) : (
        <div className="absolute right-3 top-2 z-20 text-[11px] font-bold text-white/80 tabular-nums">
          {items.length ? `${index + 1} / ${items.length}` : ""}
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-scroll overscroll-y-contain"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {items.map((row, i) => (
          <section
            key={row.id}
            className={`relative flex w-full shrink-0 snap-start snap-always flex-col ${slideMinH}`}
          >
            <div className="absolute inset-0">
              {i === index ? (
                <LiveCommerceShell
                  videoUrl={row.videoUrl || ""}
                  youtubeVideoId={row.youtubeVideoId}
                  title={feedDisplayTitle(row)}
                  isLive={Boolean(row.isLive)}
                  className="h-full"
                />
              ) : (
                <img src={row.product?.imageUrl || row.thumbUrl} alt="" className="h-full w-full object-cover opacity-80" />
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            <div
              className="absolute bottom-0 left-0 right-0 z-10 p-4"
              style={{ paddingBottom: embedded ? "calc(5.5rem + env(safe-area-inset-bottom, 0px))" : FEED_SCROLL_BOTTOM_PAD }}
            >
              <p className="line-clamp-2 text-[15px] font-bold text-white">{feedDisplayTitle(row)}</p>
              <div className="pointer-events-auto mt-2">
                <ChannelProfileLink item={row} onOpenStore={onOpenStore} isDarkMode={isDarkMode} />
              </div>
            </div>
            {i === index ? (
              <div className="pointer-events-auto absolute right-2 top-1/2 z-20 -translate-y-1/2">
                <CommerceSideRail
                  item={row}
                  onToast={onToast}
                  onOpenStore={onOpenStore}
                  compact
                  isGuestMode={isGuestMode}
                  onRequireAuth={onRequireAuth}
                />
              </div>
            ) : null}
          </section>
        ))}
        {!items.length ? (
          <p className="flex h-[40vh] items-center justify-center text-[13px] text-white/60">쇼츠 영상이 없습니다.</p>
        ) : null}
      </div>
    </div>
  );
}
