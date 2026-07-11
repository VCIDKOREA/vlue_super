/**
 * 통화 쇼케이스 신원 마크 — 상대 프로필 사진 또는 이름 첫 글자
 * (배경 갤러리와 분리 · VLUE 로고는 안심(비공개) 모드에서만)
 */

function firstNonEmpty(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

function nameInitial(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  return s.slice(0, 1);
}

/**
 * @param {{
 *   style?: object | null,
 *   card?: object | null,
 *   displayName?: string,
 *   exposeCustom?: boolean,
 *   brandLogoUrl?: string
 * }} input
 * @returns {{ type: 'image'|'initial'|'brand', url?: string, initial?: string }}
 */
export function resolveShowcasePeerAvatar({
  style = null,
  card = null,
  displayName = "",
  exposeCustom = true,
  brandLogoUrl = ""
} = {}) {
  if (!exposeCustom) {
    return brandLogoUrl
      ? { type: "brand", url: brandLogoUrl }
      : { type: "initial", initial: nameInitial(displayName || card?.name || card?.displayName) };
  }

  const feed = style?.platformFeed || card?.showcaseStyle?.platformFeed || {};
  const styleType = String(style?.styleType || card?.showcaseStyle?.styleType || "default");

  let url = "";
  if (styleType === "kakao") {
    url = firstNonEmpty(feed.kakaoAvatarUrl, card?.kakaoAvatarUrl);
  } else if (styleType === "instagram") {
    url = firstNonEmpty(feed.instagramAvatarUrl, card?.instagramAvatarUrl);
  }

  if (!url) {
    url = firstNonEmpty(
      feed.avatarUrl,
      card?.avatarUrl,
      card?.photoUrl,
      card?.image_url,
      card?.profileImageUrl
    );
  }

  if (url) return { type: "image", url };

  const initial = nameInitial(
    displayName || card?.name || card?.displayName || feed.kakaoProfileTitle || ""
  );
  return { type: "initial", initial };
}
