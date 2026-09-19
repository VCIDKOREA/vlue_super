import { useEffect, useState } from "react";
import { AD_SLOT, ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";
import AdMobBannerSlot from "./AdMobBannerSlot.jsx";
import {
  hasCustomRibbonBanner,
  readRibbonBanner,
  RIBBON_BANNER_CHANGED_EVENT
} from "../../lib/showcase/ribbonBannerStorage.js";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";

const BANNER_H = 50;

/**
 * DCC+ 쇼케이스 하단 띠배너 — 라벨 없이 배너 영역만 최대 활용.
 */
export default function ShowcaseDccBottomBanner({
  membershipTier = "free",
  enabled = true,
  className = ""
}) {
  const isPaid = isPaidLetteringTier(membershipTier);
  const [custom, setCustom] = useState(() => readRibbonBanner());

  useEffect(() => {
    const sync = () => setCustom(readRibbonBanner());
    window.addEventListener(RIBBON_BANNER_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(RIBBON_BANNER_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    try {
      const bridge = window.VlueLettering || window.Android;
      bridge?.hideNativeAdFallback?.();
      bridge?.hideBannerAd?.("bottom");
      bridge?.hideBannerAd?.("ribbon");
    } catch {
      /* ignore */
    }
    return undefined;
  }, [enabled]);

  if (!enabled) return null;

  const shellCls =
    `showcase-dcc-bottom-banner relative z-[3] shrink-0 w-full bg-[#0b1220] ${className}`.trim();
  const shellStyle = {
    paddingBottom: "env(safe-area-inset-bottom, 0px)"
  };

  if (isPaid && hasCustomRibbonBanner(custom)) {
    const href = String(custom.linkUrl || "").trim();
    const img = (
      <img src={custom.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
    );
    return (
      <div className={shellCls} style={shellStyle} data-vlue-dcc-banner="custom" aria-label="하단 배너">
        <div className="mx-auto w-full overflow-hidden" style={{ height: BANNER_H, minHeight: BANNER_H }}>
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
              {img}
            </a>
          ) : (
            img
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={shellCls} style={shellStyle} data-vlue-dcc-banner="ad" aria-label="하단 배너">
      <AdMobBannerSlot
        slotId={AD_SLOT.DCC_BOTTOM || "dcc_bottom"}
        heightPx={BANNER_H}
        unitId={ADMOB_TEST.BANNER}
        label="하단 배너"
        enabled={enabled}
        preferredSize="BANNER"
        className="w-full"
      />
    </div>
  );
}
