import { useEffect, useState } from "react";
import { feedDisplayTitle } from "../../lib/mediaCommerceCatalog.js";
import { loadRelatedFeedItemsEnriched } from "../../lib/mediaCommerceFeedService.js";
import { useHorizontalDragScroll } from "../../hooks/useHorizontalDragScroll.js";
import FeedThumbImage from "./FeedThumbImage.jsx";

function formatKrw(n) {
  const v = Number(n || 0);
  return v > 0 ? `${v.toLocaleString("ko-KR")}원` : "가격 문의";
}

/**
 * 상품 상세 하단 — 함께 보면 좋을 상품 (쿠팡형 가로 추천)
 */
export default function RelatedProductsStrip({ currentItem, onOpen, isDarkMode = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { scrollerRef, scrollerProps, guardClick } = useHorizontalDragScroll();

  useEffect(() => {
    if (!currentItem?.id) {
      setItems([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    loadRelatedFeedItemsEnriched(currentItem, 10)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentItem?.id]);

  if (!loading && !items.length) return null;

  const titleCls = isDarkMode ? "text-white" : "text-slate-900";
  const subCls = isDarkMode ? "text-gray-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#161922] border-white/10" : "bg-white border-slate-200";
  const priceCls = isDarkMode ? "text-rose-400" : "text-rose-600";

  return (
    <section className={`mt-4 rounded-2xl border p-3 ${isDarkMode ? "border-white/10 bg-[#12151c]" : "border-slate-200 bg-slate-50"}`}>
      <div className="mb-2.5">
        <h3 className={`text-[15px] font-black ${titleCls}`}>함께 보면 좋을 상품</h3>
        <p className={`mt-0.5 text-[11px] font-medium ${subCls}`}>이 상품과 비슷한 VLUE 추천</p>
      </div>

      {loading ? (
        <p className={`py-6 text-center text-[12px] ${subCls}`}>추천 불러오는 중…</p>
      ) : (
        <div className="min-w-0 w-full overflow-hidden">
          <div
            ref={scrollerRef}
            {...scrollerProps}
            className="flex min-w-0 cursor-grab touch-pan-x gap-2.5 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => {
              const price = Number(item.product?.priceKrw) || 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={guardClick(() => onOpen?.(item))}
                  className={`mkt-related-card shrink-0 w-[8.75rem] overflow-hidden rounded-xl border text-left shadow-sm transition active:scale-[0.98] ${cardBg}`}
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-200">
                    <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" draggable={false} />
                  </div>
                  <div className="space-y-1 p-2">
                    <p className={`line-clamp-2 text-[11px] font-bold leading-snug ${titleCls}`}>
                      {feedDisplayTitle(item)}
                    </p>
                    <p className={`text-[12px] font-black tabular-nums ${priceCls}`}>{formatKrw(price)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
