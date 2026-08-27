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
  return Boolean(
    String(card.organization || card.companyName || "").trim() ||
      String(card.titlePhotoUrl || "").trim() ||
      String(card.email || "").trim() ||
      String(card.logoUrl || card.logo_url || "").trim() ||
      String(card.website || "").trim() ||
      String(card.title || card.jobTitle || "").trim() ||
      String(card.photoUrl || card.image_url || card.avatarUrl || "").trim()
  );
}

/**
 * true = 풀 쇼케이스 허용.
 * 명시 includeDigitalCard:false → false.
 * 송출 키 누락이어도 DCC 실콘텐츠(이메일·사진·상호 등) 있으면 true (전중희 lookup 누락 대응).
 */
export function peerHasDccOrShowcaseContent(card, style) {
  const st = style || card?.showcaseStyle || null;
  if (st && typeof st === "object" && st.includeDigitalCard === false) return false;
  const media = styleHasShowcaseMedia(st);
  const body = cardHasDccBody(card);
  if (peerShowcaseBroadcastOn(st)) {
    if (media || body) return true;
    const handle = String(card?.publicHandle || card?.loginId || card?.vlueId || "")
      .trim()
      .replace(/^@/, "");
    return Boolean(handle);
  }
  /* 키 누락: 실콘텐츠면 쇼케이스 경로 (Android VlueAuthMemberPopupPolicy 와 동일) */
  if (media || body) return true;
  const digitalActive = card?.digitalCardActive === true;
  const handle = String(card?.publicHandle || card?.loginId || card?.vlueId || "")
    .trim()
    .replace(/^@/, "");
  return Boolean(digitalActive && handle);
}

/**
 * 접힌 빅푸시 바 크롬 (핸들 Showcase + 썸네일).
 * 페이지 본문 없어도 사진·핸들만 있으면 이름표시(인증-only) 대신 쇼케이스 바.
 */
export function peerHasShowcaseBarChrome(card, style) {
  const st = style || card?.showcaseStyle || null;
  if (st && typeof st === "object" && st.includeDigitalCard === false) return false;
  if (peerHasDccOrShowcaseContent(card, st)) return true;
  if (!peerShowcaseBroadcastOn(st) && card?.digitalCardActive !== true) {
    /* 송출 키·active 둘 다 없으면 바 크롬도 인증-only */
    const body = cardHasDccBody(card);
    if (!body) return false;
  }
  const handle = String(card?.publicHandle || card?.loginId || card?.vlueId || "")
    .trim()
    .replace(/^@/, "");
  const photo = String(
    card?.photoUrl || card?.image_url || card?.avatarUrl || card?.titlePhotoUrl || ""
  ).trim();
  return Boolean(handle || photo);
}
