import { useEffect, useRef, useState } from "react";
import { AD_SLOT, ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";

/**
 * Adaptive Banner DOM 슬롯 — Android AdView를 좌표에 겹침.
 * 웹/로딩 중에는 고정 높이 스켈레톤 + Test Ad 배지로 레이아웃 붕괴 방지.
 *
 * @param {{
 *   slotId?: string,
 *   heightPx?: number,
 *   className?: string,
 *   label?: string,
 *   unitId?: string,
 * }} props
 */
export default function AdMobBannerSlot({
  slotId = AD_SLOT.BOTTOM,
  heightPx = 50,
  className = "",
  label = "배너 광고",
  unitId = ADMOB_TEST.BANNER
}) {
  const ref = useRef(null);
  const [nativeReady, setNativeReady] = useState(false);

  useEffect(() => {
    const bridge = window.VlueLettering || window.Android;
    if (!ref.current || typeof bridge?.showBannerAd !== "function") {
      setNativeReady(false);
      return undefined;
    }
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const visible = rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 8;
        try {
          const raw = bridge.showBannerAd(
            String(slotId),
            JSON.stringify({
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              visible,
              unitId
            })
          );
          let parsed = raw;
          try {
            parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          } catch {
            parsed = { ok: false };
          }
          setNativeReady(Boolean(parsed?.ok || parsed?.accepted));
        } catch {
          setNativeReady(false);
        }
      });
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(sync) : null;
    observer?.observe(ref.current);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      try {
        bridge.hideBannerAd?.(String(slotId));
      } catch {
        /* ignore */
      }
    };
  }, [slotId, unitId]);

  return (
    <div
      ref={ref}
      className={`vlue-ad-banner-slot relative flex w-full items-center justify-center overflow-hidden ${className}`.trim()}
      style={{ height: heightPx, minHeight: heightPx }}
      data-vlue-ad-slot={slotId}
      data-ad-unit={unitId}
      aria-label={label}
    >
      {!nativeReady ? (
        <div className="vlue-ad-banner-slot__skeleton absolute inset-0 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100">
          <span className="vlue-ad-test-badge" aria-hidden>
            Test Ad
          </span>
          <span className="text-[10px] font-bold tracking-tight text-slate-400">{label} 불러오는 중…</span>
        </div>
      ) : null}
    </div>
  );
}
