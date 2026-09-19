import { useEffect, useMemo, useState } from "react";
import {
  HQ_HOME_LAYOUT_CHANGED,
  mergeHomeLayout,
  readCachedHomeLayout
} from "../../lib/homeLayoutConfig.js";
import AdMobNativeFallbackSlot from "./AdMobNativeFallbackSlot.jsx";
import SponsorShowcaseOverlay from "./SponsorShowcaseOverlay.jsx";

/** 네이버 클립 / 인스타 릴스형 세로 썸네일 (약 9:16) */
const CLIP_W = 132;
const CLIP_H = 234;

/**
 * 홈 「추천 스폰서」
 * - customSponsorList → 커스텀 클립 → SponsorShowcaseOverlay (웹 CTA)
 * - AdMob → 커스텀 클립 → PeerShowcasePreview(쇼케이스 UI) + NativeAdView 슬롯 CTA
 */
export default function HomeCentralFeedBanner({ className = "", layout: layoutProp = null }) {
  const [layout, setLayout] = useState(
    () => layoutProp || readCachedHomeLayout() || mergeHomeLayout(null)
  );
  const [activeSponsor, setActiveSponsor] = useState(null);

  useEffect(() => {
    if (layoutProp) setLayout(layoutProp);
  }, [layoutProp]);

  useEffect(() => {
    const onChange = (ev) => {
      setLayout(ev?.detail || readCachedHomeLayout() || mergeHomeLayout(null));
    };
    window.addEventListener(HQ_HOME_LAYOUT_CHANGED, onChange);
    return () => window.removeEventListener(HQ_HOME_LAYOUT_CHANGED, onChange);
  }, []);

  const sponsors = useMemo(() => {
    const list = Array.isArray(layout?.customSponsorList) ? layout.customSponsorList : [];
    return list.filter((s) => s && (s.mediaUrl || s.headline || s.advertiser));
  }, [layout]);

  return (
    <section
      className={`home-central-feed-banner shrink-0 px-2.5 py-2 ${className}`.trim()}
      data-home-anchor="central-banner"
      aria-label="추천 스폰서 쇼케이스"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-black tracking-tight text-slate-600">추천 스폰서 쇼케이스</p>
        <span className="vlue-ad-test-badge">Test Ad</span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sponsors.map((s) => (
          <button
            key={s.id || s.headline}
            type="button"
            onClick={() => setActiveSponsor(s)}
            className="relative shrink-0 snap-start overflow-hidden rounded-[16px] bg-slate-900 text-left"
            style={{ width: CLIP_W, height: CLIP_H }}
          >
            {s.mediaUrl ? (
              <img src={s.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2 pb-2.5 pt-12">
              <p className="text-[10px] font-bold text-sky-300">{s.advertiser || "스폰서"}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] font-black leading-snug text-white">{s.headline}</p>
              {s.body ? (
                <p className="mt-0.5 line-clamp-1 text-[9px] text-slate-300">{s.body}</p>
              ) : null}
            </div>
            <span className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1 py-0.5 text-[8px] font-black text-white">
              AD
            </span>
          </button>
        ))}

        <AdMobNativeFallbackSlot />
      </div>

      {/* customSponsorList 전용 — AdMob은 App AdMobShowcaseOverlay(PeerShowcasePreview) */}
      <SponsorShowcaseOverlay
        open={Boolean(activeSponsor)}
        sponsor={activeSponsor}
        onClose={() => setActiveSponsor(null)}
      />
    </section>
  );
}
