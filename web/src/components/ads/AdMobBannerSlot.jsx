import { useEffect, useRef, useState } from "react";
import { AD_SLOT, ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";

function hideSlot(bridge, slotId) {
  try {
    bridge?.hideBannerAd?.(String(slotId));
  } catch {
    /* ignore */
  }
}

/**
 * Adaptive Banner DOM 슬롯 — Android AdView를 좌표에 겹침.
 * visible=false / unmount 시 반드시 hide 해서 공중 부유 오버레이를 남기지 않는다.
 */
export default function AdMobBannerSlot({
  slotId = AD_SLOT.BOTTOM,
  heightPx = 50,
  className = "",
  label = "배너 광고",
  unitId = ADMOB_TEST.BANNER,
  enabled = true,
  /** BANNER = 320x50 고정, ADAPTIVE = 화면폭 Adaptive (테스트 문구에 468x60 등이 뜰 수 있음) */
  preferredSize = "ADAPTIVE"
}) {
  const ref = useRef(null);
  const [nativeReady, setNativeReady] = useState(false);

  useEffect(() => {
    const bridge = window.VlueLettering || window.Android;
    if (!enabled || !ref.current || typeof bridge?.showBannerAd !== "function") {
      setNativeReady(false);
      hideSlot(bridge, slotId);
      return undefined;
    }
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const visible =
          rect.bottom > 8 &&
          rect.top < window.innerHeight - 8 &&
          rect.width > 8 &&
          rect.height > 8;
        if (!visible) {
          hideSlot(bridge, slotId);
          setNativeReady(false);
          return;
        }
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
              visible: true,
              unitId,
              preferredSize
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
    const onHideAll = () => {
      hideSlot(bridge, slotId);
      setNativeReady(false);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(sync) : null;
    observer?.observe(ref.current);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    window.addEventListener("vlue-hide-all-ads", onHideAll);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      window.removeEventListener("vlue-hide-all-ads", onHideAll);
      document.removeEventListener("visibilitychange", sync);
      hideSlot(bridge, slotId);
      setNativeReady(false);
    };
  }, [slotId, unitId, enabled, preferredSize]);

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
