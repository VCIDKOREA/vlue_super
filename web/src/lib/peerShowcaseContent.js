/**
 * 통화·공유에서 상대가 DCC/쇼케이스 송출 콘텐츠가 있는지.
 * 송출 OFF 이거나 실콘텐츠 없으면 VLUE 인증 팝업만 (빈 쇼케이스 금지).
 */

/** 라이브 송출 ON — LetteringOverlayHost 와 동일 (includeDigitalCard === true) */
export function peerShowcaseBroadcastOn(style) {
  return Boolean(style && typeof style === "object" && style.includeDigitalCard === true);
}

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
  /* 송출 플래그만 켜져 있고 명함 본문이 없으면 DCC로 보지 않음 */
  const styleOn = card.showcaseStyle?.includeDigitalCard === true || card.digitalCardActive === true;
  if (!styleOn) return false;
  return Boolean(
    String(card.organization || card.companyName || "").trim() ||
      String(card.titlePhotoUrl || "").trim() ||
      String(card.email || "").trim() ||
      String(card.logoUrl || "").trim() ||
      String(card.website || "").trim() ||
      String(card.title || "").trim()
  );
}

/**
 * true = 풀 쇼케이스 허용 (송출 ON + DCC 본문 또는 쇼케이스 미디어)
 * 무료/유료 무관 · 송출 꺼짐이면 false → 인증 팝업
 */
export function peerHasDccOrShowcaseContent(card, style) {
  const st = style || card?.showcaseStyle || null;
  if (!peerShowcaseBroadcastOn(st)) return false;
  if (styleHasShowcaseMedia(st)) return true;
  if (cardHasDccBody({ ...card, showcaseStyle: st || card?.showcaseStyle })) return true;
  return false;
}

/**
 * 접힌 빅푸시 바 크롬 (핸들 Showcase + 썸네일).
 * 페이지 본문 없어도 사진·핸들만 있으면 이름표시(인증-only) 대신 쇼케이스 바.
 */
export function peerHasShowcaseBarChrome(card, style) {
  const st = style || card?.showcaseStyle || null;
  if (!peerShowcaseBroadcastOn(st)) return false;
  if (peerHasDccOrShowcaseContent(card, st)) return true;
  const handle = String(card?.publicHandle || card?.loginId || card?.vlueId || "")
    .trim()
    .replace(/^@/, "");
  const photo = String(
    card?.photoUrl || card?.image_url || card?.avatarUrl || card?.titlePhotoUrl || ""
  ).trim();
  return Boolean(handle || photo);
}
