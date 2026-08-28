function firstText(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

function isLikelyWebUrl(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return (
    /^https?:\/\//i.test(s) ||
    /^pf\.kakao\.com/i.test(s) ||
    /^open\.kakao\.com/i.test(s)
  );
}

export function isKakaoOAuthLinked(feed) {
  if (!feed || typeof feed !== "object") return false;
  if (feed.kakaoVerified === true) return true;
  return Boolean(String(feed.kakaoUserId || "").trim());
}

/**
 * 쇼케이스 비즈니스 쇼셜 아이콘 목록 (인스타·유튜브·카카오 OAuth 등)
 * @param {object|null|undefined} style showcaseStyle
 */
export function listShowcaseSocialOutlinks(style) {
  const outlinks = style?.commercial?.outlinks || {};
  const feed = style?.platformFeed || {};

  const ig =
    firstText(outlinks.instagram, feed.instagramProfileUrl) ||
    (feed.instagramHandle
      ? `https://instagram.com/${String(feed.instagramHandle).replace(/^@/, "")}`
      : "");

  const legacyKakao = firstText(outlinks.kakao);
  const kakaoOpen = firstText(
    outlinks.kakaoOpenChat,
    /open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  );

  const rawKakaoProfile = firstText(
    outlinks.kakaoProfile,
    feed.kakaoProfileUrl,
    legacyKakao && !/open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  );
  const kakaoProfile = isLikelyWebUrl(rawKakaoProfile) ? rawKakaoProfile : "";

  const kakaoOAuthLinked = isKakaoOAuthLinked(feed);
  const kakaoVerifiedProfile =
    !kakaoProfile && kakaoOAuthLinked
      ? firstText(feed.kakaoProfileTitle, rawKakaoProfile) || "카카오 프로필"
      : "";

  const facebook = firstText(outlinks.facebook);
  const youtube = firstText(outlinks.youtube);

  return [
    ig ? { id: "instagram", label: "Instagram", url: ig, className: "is-ig" } : null,
    youtube ? { id: "youtube", label: "YouTube", url: youtube, className: "is-yt" } : null,
    facebook ? { id: "facebook", label: "Facebook", url: facebook, className: "is-fb" } : null,
    kakaoOpen
      ? { id: "kakao-open", label: "카카오 오픈채팅", url: kakaoOpen, className: "is-kakao" }
      : null,
    kakaoProfile
      ? { id: "kakao-profile", label: "카카오 프로필", url: kakaoProfile, className: "is-kakao" }
      : null,
    kakaoVerifiedProfile
      ? {
          id: "kakao-profile-verified",
          label: kakaoVerifiedProfile,
          url: "",
          verified: true,
          className: "is-kakao"
        }
      : null
  ].filter(Boolean);
}

/** 캐러셀·크롬용 style 병합 (prop 우선, platformFeed·outlinks 깊은 병합) */
export function mergeShowcaseStyleForChrome(cardStyle, showcaseStyle) {
  const fromCard = cardStyle && typeof cardStyle === "object" ? cardStyle : {};
  const fromProp = showcaseStyle && typeof showcaseStyle === "object" ? showcaseStyle : null;
  if (!fromProp) return fromCard;
  return {
    ...fromCard,
    ...fromProp,
    platformFeed: { ...fromCard.platformFeed, ...fromProp.platformFeed },
    commercial: {
      ...fromCard.commercial,
      ...fromProp.commercial,
      outlinks: {
        ...(fromCard.commercial?.outlinks || {}),
        ...(fromProp.commercial?.outlinks || {})
      }
    }
  };
}
