/**
 * 유료 미리보기용 쇼케이스 배너 (갤러리 비어 있을 때 캐러셀 확인용)
 * 실제 저장된 사진이 있으면 이 목록은 사용하지 않음
 */
export const DEMO_SHOWCASE_BANNERS = Object.freeze([
  {
    id: "demo-showcase-1",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
    caption: "프리미엄 오피스 · 브랜드 화보",
    overlayText: "VLUE Showcase"
  },
  {
    id: "demo-showcase-2",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80",
    caption: "시티 스카이라인",
    overlayText: "비즈니스 광고판"
  },
  {
    id: "demo-showcase-3",
    url: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200&q=80",
    caption: "미팅 · 컨설팅",
    overlayText: "하이엔드 프로모션"
  }
]);

/**
 * 유료 캐러셀용 배너 목록
 * @param {Array} photos
 * @param {{ previewMode?: boolean, max?: number }} [opts]
 */
export function resolvePaidShowcaseBanners(photos, opts = {}) {
  const max = Math.max(1, Number(opts.max) || 10);
  const saved = (Array.isArray(photos) ? photos : []).filter((p) => p?.url).slice(0, max);
  if (saved.length) return saved;
  if (opts.previewMode) return DEMO_SHOWCASE_BANNERS.slice(0, max);
  return [];
}
