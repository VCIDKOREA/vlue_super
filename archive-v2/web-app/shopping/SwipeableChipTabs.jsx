import { useEffect } from "react";
import { useHorizontalDragScroll } from "../../hooks/useHorizontalDragScroll.js";

/**
 * 가로 스크롤 탭 칩 — 모바일 스와이프 · PC 마우스 드래그
 */
export default function SwipeableChipTabs({ tabs, activeId, onChange, theme }) {
  const { scrollerRef, scrollerProps } = useHorizontalDragScroll();

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const btn = el.querySelector(`[data-tab-id="${activeId}"]`);
    if (btn?.scrollIntoView) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeId, scrollerRef]);

  return (
    <div className="min-w-0 w-full overflow-hidden">
      <div
        ref={scrollerRef}
        {...scrollerProps}
        className="flex w-full min-w-0 cursor-grab touch-pan-x gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-3 py-2.5 pr-5 snap-x snap-proximity [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="피드 카테고리"
      >
        {tabs.map((tab) => {
          const active = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-tab-id={tab.id}
              onClick={() => onChange?.(tab.id)}
              className={`shrink-0 snap-center select-none rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
                active ? theme.chipActive : theme.chipIdle
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
