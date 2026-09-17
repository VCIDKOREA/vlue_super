import { useLayoutEffect } from "react";
import { AD_SLOT, ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";
import AdMobBannerSlot from "./AdMobBannerSlot.jsx";

const BOTTOM_BANNER_H = 50;

/**
 * BottomNav 바로 위 고정 띠배너 — 팔로우 쇼케이스 시트보다 상위 z-index.
 * 무료/유료 공통 상시 노출.
 */
export default function HomeBottomFixedBanner({ className = "" }) {
  useLayoutEffect(() => {
    const sync = () => {
      const chrome = document.querySelector("[data-vlue-bottom-chrome]");
      if (!chrome) return;
      const h = Math.round(chrome.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty("--vlue-bottom-nav-offset", `${h}px`);
      }
    };
    sync();
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      const nav = document.querySelector("[data-vlue-bottom-nav]");
      const navH = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
      if (navH > 0) {
        document.documentElement.style.setProperty("--vlue-bottom-nav-offset", `${navH}px`);
      }
    };
  }, []);

  return (
    <div
      data-vlue-bottom-banner
      className={`vlue-bottom-fixed-banner w-full border-t border-slate-200/80 bg-white ${className}`.trim()}
      style={{ height: BOTTOM_BANNER_H, minHeight: BOTTOM_BANNER_H }}
      aria-label="하단 고정 배너"
    >
      <AdMobBannerSlot
        slotId={AD_SLOT.BOTTOM}
        heightPx={BOTTOM_BANNER_H}
        unitId={ADMOB_TEST.BANNER}
        label="하단 고정 배너"
        className="w-full"
      />
    </div>
  );
}

export { BOTTOM_BANNER_H };
