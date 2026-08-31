export const OPEN_OWN_SHOWCASE_SLIDE_EVENT = "vlue-open-own-showcase-slide";

export function openOwnShowcaseSlide({ contentOrdinal = 0, slideId = "" } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_OWN_SHOWCASE_SLIDE_EVENT, {
      detail: {
        contentOrdinal: Math.max(0, Math.floor(Number(contentOrdinal) || 0)),
        slideId: String(slideId || "").trim()
      }
    })
  );
}

export function isShowcaseLikeNotification(item) {
  if (!item) return false;
  if (item.showcaseNotifyType === "vlue-showcase-like") return true;
  if (item.kind === "vlue-showcase-like") return true;
  const title = String(item.title || "");
  return item.category === "쇼케이스" && /좋아요/.test(title);
}

export function showcaseLikeNavFromNotification(item) {
  if (!isShowcaseLikeNotification(item)) return null;
  const fromBody = String(item.body || "").match(/쇼케이스\s*(\d+)\s*번/);
  const ordinal =
    Number(item.showcaseContentOrdinal) ||
    (fromBody ? Number(fromBody[1]) : 0) ||
    0;
  return {
    contentOrdinal: ordinal,
    slideId: String(item.showcaseSlideId || "").trim()
  };
}
