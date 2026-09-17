import { useEffect, useState } from "react";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { resolveEffectiveMembershipTier } from "../../lib/effectiveMembership.js";
import {
  hasCustomRibbonBanner,
  readRibbonBanner,
  RIBBON_BANNER_CHANGED_EVENT
} from "../../lib/showcase/ribbonBannerStorage.js";
import { AD_SLOT, ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";
import AdMobBannerSlot from "./AdMobBannerSlot.jsx";

const RIBBON_H = 50;

/**
 * 빅푸시 「전화화면 보기」자리 → 가로 띠배너.
 * 유료: 커스텀 이미지(+링크) 우선, 미등록 시 AdMob fallback.
 * 무료: AdMob 상시.
 */
export default function ShowcaseRibbonBanner({ membershipTier = "free", className = "" }) {
  const tier = resolveEffectiveMembershipTier(membershipTier);
  const isPaid = isPaidLetteringTier(tier);
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

  const showCustom = isPaid && hasCustomRibbonBanner(custom);

  if (showCustom) {
    const href = String(custom.linkUrl || "").trim();
    const img = (
      <img
        src={custom.imageUrl}
        alt="등록 배너"
        className="h-full w-full object-cover"
        draggable={false}
      />
    );
    return (
      <div
        className={`showcase-ribbon-banner showcase-ribbon-banner--custom overflow-hidden rounded-lg ${className}`.trim()}
        style={{ height: RIBBON_H, minHeight: RIBBON_H }}
        data-vlue-ribbon="custom"
      >
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-full w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    );
  }

  return (
    <AdMobBannerSlot
      slotId={AD_SLOT.RIBBON}
      heightPx={RIBBON_H}
      unitId={ADMOB_TEST.BANNER}
      label="띠배너 광고"
      className={`showcase-ribbon-banner showcase-ribbon-banner--ad rounded-lg border border-white/10 ${className}`.trim()}
    />
  );
}
