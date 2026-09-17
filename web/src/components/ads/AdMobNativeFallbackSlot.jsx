import { useEffect, useRef } from "react";
import { ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";

/**
 * @param {{ compact?: boolean, className?: string }} props
 */
export default function AdMobNativeFallbackSlot({ compact = false, className = "" }) {
  const ref = useRef(null);
  const heightClass = compact ? "h-[180px]" : "h-[246px]";

  useEffect(() => {
    const bridge = window.VlueLettering || window.Android;
    if (!ref.current || typeof bridge?.showNativeAdFallback !== "function") return undefined;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        bridge.showNativeAdFallback(
          JSON.stringify({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            visible: rect.bottom > 0 && rect.top < window.innerHeight,
            unitId: ADMOB_TEST.NATIVE
          })
        );
      });
    };
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(sync) : null;
    observer?.observe(ref.current);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      bridge.hideNativeAdFallback?.();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`home-banner-slide relative flex ${heightClass} snap-start items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 ${className}`.trim()}
      aria-label="맞춤 광고"
      data-ad-unit={ADMOB_TEST.NATIVE}
    >
      <span className="vlue-ad-test-badge absolute left-2 top-2 z-[1]">Test Ad</span>
      <span className="text-[11px] font-bold text-slate-400">맞춤 광고 불러오는 중…</span>
    </div>
  );
}
