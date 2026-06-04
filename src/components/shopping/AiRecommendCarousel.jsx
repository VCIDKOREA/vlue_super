import { useCallback, useEffect, useState } from "react";
import { feedDisplayTitle, feedMetaLine } from "../../lib/mediaCommerceCatalog.js";
import { loadAiRecommendEnriched } from "../../lib/mediaCommerceFeedService.js";
import { useHorizontalDragScroll } from "../../hooks/useHorizontalDragScroll.js";
import FeedThumbImage from "./FeedThumbImage.jsx";
import ChannelProfileLink from "./ChannelProfileLink.jsx";

/** AI 추천 영상 — 좌우 스냅 슬라이드 (터치 스와이프 · PC 드래그) */
export default function AiRecommendCarousel({ theme, onOpen, onOpenStore, isDarkMode }) {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const { scrollerRef, scrollerProps, guardClick } = useHorizontalDragScroll();

  useEffect(() => {
    loadAiRecommendEnriched().then((rows) => {
      setItems(rows);
      setIndex(0);
    });
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !items.length) return;
    const w = el.clientWidth;
    if (!w) return;
    const i = Math.round(el.scrollLeft / w);
    if (i >= 0 && i < items.length && i !== index) setIndex(i);
  }, [index, items.length, scrollerRef]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll, scrollerRef]);

  const goTo = (i) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIndex(i);
  };

  if (!items.length) return null;

  return (
    <section className={`mb-4 rounded-2xl border p-3 ${theme.aiSection}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={`text-[11px] font-black uppercase tracking-wide ${theme.aiTitle}`}>✨ AI 추천 영상</p>
          <p className={`mt-0.5 text-[11px] ${theme.meta}`}>좌우로 밀어 다음 추천 보기</p>
        </div>
        <span className={`shrink-0 text-[11px] font-bold tabular-nums ${theme.sub}`}>
          {index + 1} / {items.length}
        </span>
      </div>

      <div className="mt-3 min-w-0 w-full overflow-hidden rounded-xl">
        <div
          ref={scrollerRef}
          {...scrollerProps}
          className="flex w-full min-w-0 cursor-grab touch-pan-x snap-x snap-proximity overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <article
              key={item.id}
              className="box-border w-full flex-[0_0_100%] shrink-0 snap-center select-none"
            >
              <button type="button" onClick={guardClick(() => onOpen(item))} className="w-full text-left">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-200">
                  <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" draggable={false} />
                  <span className="absolute left-2 top-2 rounded bg-violet-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                    AI
                  </span>
                  {item.isLive ? (
                    <span className="absolute right-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                      LIVE
                    </span>
                  ) : null}
                  <span className="pointer-events-none absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
                    ▶
                  </span>
                </div>
                <h3 className={`mt-2 line-clamp-2 text-[14px] font-bold leading-snug ${theme.title}`}>
                  {feedDisplayTitle(item)}
                </h3>
                <p className={`mt-1 line-clamp-1 text-[12px] ${theme.meta}`}>{feedMetaLine(item)}</p>
              </button>
              <div
                className={`mt-2 flex items-center justify-between gap-2 border-t pt-2 ${theme.aiDivider}`}
                onClickCapture={guardClick()}
              >
                <ChannelProfileLink item={item} onOpenStore={onOpenStore} isDarkMode={isDarkMode} size="sm" />
                <button
                  type="button"
                  onClick={guardClick(() => onOpen(item))}
                  className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  재생
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}번째 추천`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? `w-5 ${theme.dotActive}` : `w-1.5 ${theme.dotIdle}`}`}
          />
        ))}
      </div>
    </section>
  );
}
