import AdMobNativeFallbackSlot from "./AdMobNativeFallbackSlot.jsx";

/**
 * 빅푸시 미리보기 하단 · 중앙 피드 — 추천 지역 스폰서 / AdMob Native.
 * 유료·무료 공통 상시 노출 (보상형/전면만 유료 면제).
 */
export default function HomeCentralFeedBanner({ className = "" }) {
  return (
    <section
      className={`home-central-feed-banner shrink-0 px-2.5 py-2 ${className}`.trim()}
      data-home-anchor="central-banner"
      aria-label="추천 지역 스폰서"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-black tracking-tight text-slate-600">추천 지역 스폰서</p>
        <span className="vlue-ad-test-badge">Test Ad</span>
      </div>
      <AdMobNativeFallbackSlot compact />
    </section>
  );
}
