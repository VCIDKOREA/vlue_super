import { useEffect, useMemo, useState } from "react";
import {
  HQ_HOME_LAYOUT_CHANGED,
  mergeHomeLayout,
  readCachedHomeLayout
} from "../../lib/homeLayoutConfig.js";
import AdMobNativeFallbackSlot from "./AdMobNativeFallbackSlot.jsx";
import SponsorShowcaseOverlay from "./SponsorShowcaseOverlay.jsx";

/**
 * 빅푸시 하단 · 추천 스폰서 쇼케이스
 * - 앱(좁은 폭): 세로 네이버 클립형(9:16) + AdMob MediaView 슬롯 1개
 * - 웹(와이드): 가로 카테크형
 * - customSponsorList 있으면 슬롯 렌더 + 1차 탭 시 오버레이
 */
export default function HomeCentralFeedBanner({ className = "", layout: layoutProp = null }) {
  const [layout, setLayout] = useState(
    () => layoutProp || readCachedHomeLayout() || mergeHomeLayout(null)
  );
  const [activeSponsor, setActiveSponsor] = useState(null);
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
  );

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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
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
        {sponsors.map((s) =>
          wide ? (
            <button
              key={s.id || s.headline}
              type="button"
              onClick={() => setActiveSponsor(s)}
              className="flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left shadow-sm"
            >
              <div className="relative h-[140px] w-full bg-slate-100">
                {s.mediaUrl ? (
                  <img src={s.mediaUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
                {s.iconUrl ? (
                  <img
                    src={s.iconUrl}
                    alt=""
                    className="absolute left-2 top-2 h-7 w-7 rounded-md bg-white/90 object-contain p-0.5 shadow"
                  />
                ) : null}
              </div>
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-blue-600">{s.advertiser || "스폰서"}</span>
                  <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-black text-slate-500">AD</span>
                </div>
                <p className="mt-1 line-clamp-1 text-[13px] font-black text-slate-900">{s.headline}</p>
                {s.body ? (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{s.body}</p>
                ) : null}
              </div>
            </button>
          ) : (
            <button
              key={s.id || s.headline}
              type="button"
              onClick={() => setActiveSponsor(s)}
              className="relative h-[220px] w-[124px] shrink-0 snap-start overflow-hidden rounded-[18px] bg-slate-900 text-left"
            >
              {s.mediaUrl ? (
                <img src={s.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-2.5 pt-10">
                <p className="line-clamp-2 text-[11px] font-black leading-snug text-white">{s.headline}</p>
                {s.body ? (
                  <p className="mt-0.5 line-clamp-1 text-[9px] text-slate-300">{s.body}</p>
                ) : null}
              </div>
              <span className="absolute right-1.5 top-1.5 rounded bg-black/45 px-1 py-0.5 text-[8px] font-black text-white">
                AD
              </span>
            </button>
          )
        )}

        {/* AdMob 슬롯은 단일 마운트 — 브릿지 이중 호출 방지 */}
        {wide ? (
          <div className="min-w-[280px] flex-1">
            <AdMobNativeFallbackSlot compact variant="landscape" />
          </div>
        ) : (
          <AdMobNativeFallbackSlot compact variant="portrait" />
        )}
      </div>

      <SponsorShowcaseOverlay
        open={Boolean(activeSponsor)}
        sponsor={activeSponsor}
        onClose={() => setActiveSponsor(null)}
      />
    </section>
  );
}
