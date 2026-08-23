/**
 * 통화·공유에서 상대가 DCC/쇼케이스 송출 콘텐츠가 있는지.
 * 없으면 VLUE 인증 팝업만 표시 (빈 쇼케이스 화면 금지).
 */
export function styleHasShowcaseMedia(style) {
  if (!style || typeof style !== "object") return false;
  if (Array.isArray(style.pages) && style.pages.some((p) => p && typeof p === "object")) {
    const meaningful = style.pages.some((p) => {
      if (!p || typeof p !== "object") return false;
      return Boolean(
        p.imageUrl ||
          p.mediaUrl ||
          p.photoUrl ||
          p.videoUrl ||
          (p.type && p.type !== "empty") ||
          (Array.isArray(p.blocks) && p.blocks.length)
      );
    });
    if (meaningful) return true;
  }
  if (Array.isArray(style.gallery?.photos) && style.gallery.photos.length > 0) return true;
  const bgm = style.bgm;
  if (bgm && typeof bgm === "object") {
    if (String(bgm.audioUrl || "").trim()) return true;
    if (Array.isArray(bgm.playlist) && bgm.playlist.some((t) => t && String(t.audioUrl || t.url || "").trim())) {
      return true;
    }
  }
  return false;
}

export function cardHasDccBody(card) {
  if (!card || typeof card !== "object") return false;
  const styleOn = card.showcaseStyle?.includeDigitalCard === true || card.digitalCardActive === true;
  if (!styleOn && !card.digitalCardIssued) return false;
  return Boolean(
    String(card.organization || card.companyName || "").trim() ||
      String(card.titlePhotoUrl || "").trim() ||
      String(card.email || "").trim() ||
      String(card.logoUrl || "").trim() ||
      String(card.website || "").trim() ||
      String(card.title || "").trim()
  );
}

/** true = DCC 또는 쇼케이스 미디어가 있어 풀 화면 허용 */
export function peerHasDccOrShowcaseContent(card, style) {
  const st = style || card?.showcaseStyle || null;
  if (styleHasShowcaseMedia(st)) return true;
  if (cardHasDccBody({ ...card, showcaseStyle: st || card?.showcaseStyle })) return true;
  return false;
}
