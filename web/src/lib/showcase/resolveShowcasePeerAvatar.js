/**
 * 통화 쇼케이스 신원 마크 — 상대 프로필 사진 / CEO VLUE 로고 / 카톡형 실루엣
 */

const PERSON_SILHOUETTE = "/avatar-person-silhouette.svg";
const CEO_BRAND_LOGO = "/vlue-brand-logo.svg";

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

function isCeoCard(card) {
  const handle = String(card?.publicHandle || card?.loginId || card?.handle || card?.vlueId || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (handle === "ceo") return true;
  const email = String(card?.email || "").trim().toLowerCase();
  if (email === "ceo@vlue.kr") return true;
  const phone = String(card?.phoneE164 || card?.phone || "").replace(/\D/g, "");
  return phone === "821080144666" || phone === "01080144666";
}

/**
 * @param {{
 *   style?: object | null,
 *   card?: object | null,
 *   displayName?: string,
 *   exposeCustom?: boolean,
 *   brandLogoUrl?: string
 * }} input
 * @returns {{ type: 'image'|'initial'|'brand'|'silhouette', url?: string, initial?: string }}
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
      : {
          type: "silhouette",
          url: PERSON_SILHOUETTE,
          initial: nameInitial(displayName || card?.name || card?.displayName)
        };
  }

  if (isCeoCard(card)) {
    return { type: "brand", url: brandLogoUrl || CEO_BRAND_LOGO };
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
      card?.photoUrl,
      card?.avatarUrl,
      feed.avatarUrl,
      card?.image_url,
      card?.profileImageUrl
    );
  }

  /* 회사 로고·VLUE 눈으로 빈 프로필을 채우지 않음 */
  if (url) return { type: "image", url };

  return {
    type: "silhouette",
    url: PERSON_SILHOUETTE,
    initial: nameInitial(
      displayName || card?.name || card?.displayName || feed.kakaoProfileTitle || ""
    )
  };
}
