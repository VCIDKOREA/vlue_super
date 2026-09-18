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
 * DCC+ 쇼케이스 하단 띠배너.
 * 홈 인디케이터(safe-area) 위에 올려 가려지지 않게 한다.
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

  if (!enabled) return null;

  const shellCls =
    `showcase-dcc-bottom-banner shrink-0 w-full bg-[#0b1220] border-t border-white/10 ${className}`.trim();
  const shellStyle = {
    paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))"
  };

  if (isPaid && hasCustomRibbonBanner(custom)) {
    const href = String(custom.linkUrl || "").trim();
    const img = (
      <img src={custom.imageUrl} alt="등록 배너" className="h-full w-full object-cover" draggable={false} />
    );
    return (
      <div className={shellCls} style={shellStyle} data-vlue-dcc-banner="custom">
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
    <div className={shellCls} style={shellStyle} data-vlue-dcc-banner="ad">
      <AdMobBannerSlot
        slotId={AD_SLOT.DCC_BOTTOM || "dcc_bottom"}
        heightPx={BANNER_H}
        unitId={ADMOB_TEST.BANNER}
        label="쇼케이스 하단 배너"
        enabled={enabled}
        preferredSize="BANNER"
        className="w-full"
      />
    </div>
  );
}
