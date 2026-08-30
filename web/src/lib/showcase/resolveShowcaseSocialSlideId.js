import { mycaseSocialSlideId } from "../mycase/mycasePostPayload.js";

/**
 * 쇼케이스·케이스함 공통 slideId — 좋아요·댓글·공유 동기화
 * @param {{ page?: object, slide?: object, photo?: object }} ctx
 */
export function resolveShowcaseSocialSlideId({ page = null, slide = null, photo = null } = {}) {
  const direct = String(slide?.socialSlideId || page?.socialSlideId || "").trim();
  if (direct) return direct.slice(0, 80);

  const caseId = String(slide?.mycaseCaseId || page?.mycaseCaseId || "").trim();
  const imageId = String(
    slide?.mycaseImageId || page?.mycaseImageId || photo?.id || slide?.photos?.[0]?.id || ""
  ).trim();
  if (caseId) {
    const linked = mycaseSocialSlideId(caseId, imageId);
    if (linked) return linked;
  }

  return String(slide?.id || page?.id || photo?.id || "").trim().slice(0, 80);
}
