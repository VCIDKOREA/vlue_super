import { AD_SLOT, ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";
import AdMobBannerSlot from "./AdMobBannerSlot.jsx";
import {
  hasCustomRibbonBanner,
  readRibbonBanner,
  RIBBON_BANNER_CHANGED_EVENT
} from "../../lib/showcase/ribbonBannerStorage.js";
import { useEffect, useState } from "react";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";

const BANNER_H = 50;

/**
 * DCC+ 쇼케이스 최하단 띠배너.
 * 유료 커스텀 등록 시 이미지, 아니면 AdMob Adaptive Banner.
 * 홈/스플래시 하단 고정 배너와 분리 — 펼친 DCC 화면 안에서만 렌더.
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

  if (isPaid && hasCustomRibbonBanner(custom)) {
    const href = String(custom.linkUrl || "").trim();
    const img = (
      <img src={custom.imageUrl} alt="등록 배너" className="h-full w-full object-cover" draggable={false} />
    );
    return (
      <div
        className={`showcase-dcc-bottom-banner shrink-0 w-full overflow-hidden border-t border-white/10 ${className}`.trim()}
        style={{ height: BANNER_H, minHeight: BANNER_H }}
        data-vlue-dcc-banner="custom"
      >
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    );
  }

  return (
    <div
      className={`showcase-dcc-bottom-banner shrink-0 w-full ${className}`.trim()}
      data-vlue-dcc-banner="ad"
    >
      <AdMobBannerSlot
        slotId={AD_SLOT.DCC_BOTTOM || "dcc_bottom"}
        heightPx={BANNER_H}
        unitId={ADMOB_TEST.BANNER}
        label="쇼케이스 하단 배너"
        enabled={enabled}
        className="w-full"
      />
    </div>
  );
}
