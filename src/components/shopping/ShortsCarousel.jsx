import { feedDisplayTitle, mediaPlatformBadge } from "../../lib/mediaCommerceCatalog.js";
import { useHorizontalScrollStrip } from "../../lib/useHorizontalScrollStrip.js";
import FeedThumbImage from "./FeedThumbImage.jsx";

function ShortCard({ item, onClick }) {
  const badge = mediaPlatformBadge(item.mediaPlatform);
  const title = feedDisplayTitle(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-[128px] shrink-0 snap-start text-left active:scale-[0.98]"
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-slate-200 shadow-sm ring-1 ring-slate-200">
        <FeedThumbImage item={item} className="h-full w-full object-cover" alt="" />
        <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-black text-white ${badge.className}`}>
          {badge.label}
        </span>
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-[9px] font-bold tabular-nums text-white">
          {item.durationLabel || "Shorts"}
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-black/15 opacity-90 transition group-active:bg-black/25">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-800">{title}</p>
      <p className="line-clamp-1 text-[10px] text-slate-500">{item.viewsLabel ? `조회 ${item.viewsLabel}` : ""}</p>
    </button>
  );
}

export default function ShortsCarousel({ items, onOpenItem }) {
  const strip = useHorizontalScrollStrip(true);

  if (!items?.length) return null;

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[12px] font-black text-slate-800">쇼츠</p>
        <p className="text-[10px] font-semibold text-slate-400">옆으로 밀어 더보기</p>
      </div>
      <div
        ref={strip.ref}
        onMouseDown={strip.onMouseDown}
        className={`flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${strip.stripClassName}`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item, index) => (
          <ShortCard
            key={item.id}
            item={item}
            onClick={strip.wrapClick(() => onOpenItem?.(item, index))}
          />
        ))}
      </div>
    </section>
  );
}
