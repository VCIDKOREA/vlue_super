import { useCallback, useEffect, useState } from "react";
import { feedDisplayTitle, feedMetaLine } from "../../lib/mediaCommerceCatalog.js";
import { loadAiRecommendEnriched } from "../../lib/mediaCommerceFeedService.js";
import { useHorizontalDragScroll } from "../../hooks/useHorizontalDragScroll.js";
import FeedThumbImage from "./FeedThumbImage.jsx";
import ChannelProfileLink from "./ChannelProfileLink.jsx";

const CARD_GAP_PX = 14;

/**
 * AI 추천 영상
 * @param {'full' | 'strip'} [variant] — full: 앱 1장 슬라이드, strip: www 스토어 다열 카드
 */
export default function AiRecommendCarousel({
  theme,
  onOpen,
  onOpenStore,
  isDarkMode,
  variant = "full"
}) {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const { scrollerRef, scrollerProps, guardClick } = useHorizontalDragScroll();
  const isStrip = variant === "strip";

  useEffect(() => {
    loadAiRecommendEnriched().then((rows) => {
      setItems(rows);
      setIndex(0);
    });
  }, []);

  const getScrollStep = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const card = el.querySelector("[data-ai-card]");
    if (!card) return el.clientWidth;
    return card.getBoundingClientRect().width + CARD_GAP_PX;
  }, [scrollerRef]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !items.length) return;
    if (isStrip) {
      const step = getScrollStep();
      if (!step) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / step)));
      if (i !== index) setIndex(i);
      return;
    }
    const w = el.clientWidth;
    if (!w) return;
    const i = Math.round(el.scrollLeft / w);
    if (i >= 0 && i < items.length && i !== index) setIndex(i);
  }, [index, items.length, scrollerRef, isStrip, getScrollStep]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll, scrollerRef]);

  const goTo = (i) => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = isStrip ? i * getScrollStep() : i * el.clientWidth;
    el.scrollTo({ left, behavior: "smooth" });
    setIndex(i);
  };

  if (!items.length) return null;

  const sectionClass = isStrip
    ? "mkt-ai-carousel mb-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40 p-4 shadow-sm"
    : `mb-4 rounded-2xl border p-3 ${theme?.aiSection || "border-slate-200 bg-white"}`;

  const titleClass = theme?.aiTitle || "text-violet-800";
  const metaClass = theme?.meta || "text-slate-500";
  const subClass = theme?.sub || "text-slate-500";
  const itemTitleClass = theme?.title || "text-slate-900";
  const dividerClass = theme?.aiDivider || "border-slate-100";
  const dotActive = theme?.dotActive || "bg-violet-600";
  const dotIdle = theme?.dotIdle || "bg-slate-300";

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={`text-sm font-black ${titleClass}`}>✨ AI 추천 영상</p>
          <p className={`mt-0.5 text-xs ${metaClass}`}>
            {isStrip ? "여러 추천을 한눈에 · 좌우로 더 보기" : "좌우로 밀어 다음 추천 보기"}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-bold tabular-nums ${subClass}`}>
          {index + 1} / {items.length}
        </span>
      </div>

      <div className={`mt-3 min-w-0 w-full overflow-hidden ${isStrip ? "" : "rounded-xl"}`}>
        <div
          ref={scrollerRef}
          {...scrollerProps}
          className={
            isStrip
              ? "mkt-ai-carousel__track flex min-w-0 cursor-grab touch-pan-x snap-x snap-proximity overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "flex w-full min-w-0 cursor-grab touch-pan-x snap-x snap-proximity overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }
          style={isStrip ? { gap: CARD_GAP_PX } : undefined}
        >
          {items.map((item) => (
            <article
              key={item.id}
              data-ai-card
              className={
                isStrip
                  ? "mkt-ai-carousel__card box-border shrink-0 snap-start select-none"
                  : "box-border w-full flex-[0_0_100%] shrink-0 snap-center select-none"
              }
            >
              <button type="button" onClick={guardClick(() => onOpen(item))} className="w-full text-left">
                <div
                  className={
                    isStrip
                      ? "mkt-ai-carousel__thumb relative overflow-hidden rounded-xl bg-slate-200"
                      : "relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-200"
                  }
                >
                  <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" draggable={false} />
                  <span className="absolute left-2 top-2 rounded bg-violet-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                    AI
                  </span>
                  {item.isLive ? (
                    <span className="absolute right-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                      LIVE
                    </span>
                  ) : null}
                  <span
                    className={`pointer-events-none absolute bottom-2 right-2 flex items-center justify-center rounded-full bg-black/50 text-white ${
                      isStrip ? "h-8 w-8 text-xs" : "h-10 w-10"
                    }`}
                  >
                    ▶
                  </span>
                </div>
                <h3
                  className={`line-clamp-2 font-bold leading-snug ${itemTitleClass} ${
                    isStrip ? "mt-1.5 text-[13px]" : "mt-2 text-[14px]"
                  }`}
                >
                  {feedDisplayTitle(item)}
                </h3>
                <p className={`mt-0.5 line-clamp-1 ${isStrip ? "text-[11px]" : "text-[12px]"} ${metaClass}`}>
                  {feedMetaLine(item)}
                </p>
              </button>
              <div
                className={`mt-1.5 flex items-center justify-between gap-2 border-t pt-1.5 ${dividerClass}`}
                onClickCapture={guardClick()}
              >
                <ChannelProfileLink item={item} onOpenStore={onOpenStore} isDarkMode={isDarkMode} size="sm" />
                <button
                  type="button"
                  onClick={guardClick(() => onOpen(item))}
                  className="shrink-0 rounded-lg bg-violet-600 px-2.5 py-1 text-[10px] font-bold text-white"
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
            className={`h-1.5 rounded-full transition-all ${i === index ? `w-5 ${dotActive}` : `w-1.5 ${dotIdle}`}`}
          />
        ))}
      </div>
    </section>
  );
}
