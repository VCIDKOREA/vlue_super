import { apiUrl } from "../apiBase.js";

function firstText(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

export function normalizeKakaoProfilePageUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/\//, "")}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase();
    if (host === "pf.kakao.com" || host === "open.kakao.com" || host.endsWith(".kakao.com")) {
      return u.href;
    }
  } catch {
    return "";
  }
  return "";
}

export function isKakaoOAuthLinked(feed) {
  if (!feed || typeof feed !== "object") return false;
  if (feed.kakaoVerified === true) return true;
  return Boolean(String(feed.kakaoUserId || "").trim());
}

function resolveStoredKakaoProfileUrl(feed, outlinks) {
  const legacyKakao = firstText(outlinks.kakao);
  const raw = firstText(
    feed?.kakaoProfileUrl,
    outlinks.kakaoProfile,
    outlinks.kakaoOpenChat,
    /open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : "",
    legacyKakao && !/open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  );
  return normalizeKakaoProfilePageUrl(raw);
}

function resolveKakaoOAuthOpenUrl(feed, outlinks, ownerUserId) {
  const direct = resolveStoredKakaoProfileUrl(feed, outlinks);
  if (direct) return direct;
  if (!isKakaoOAuthLinked(feed)) return "";
  const uid = String(ownerUserId || "").trim();
  if (!uid) return "";
  return apiUrl(`/api/v1/showcase/users/${encodeURIComponent(uid)}/kakao-profile`);
}

/**
 * 쇼케이스 비즈니스 쇼셜 아이콘 목록 (인스타·유튜브·카카오 OAuth 등)
 * @param {object|null|undefined} style showcaseStyle
 * @param {{ ownerUserId?: string }} [opts]
 */
export function listShowcaseSocialOutlinks(style, opts = {}) {
  const outlinks = style?.commercial?.outlinks || {};
  const feed = style?.platformFeed || {};
  const ownerUserId = String(opts.ownerUserId || "").trim();

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

  const kakaoOAuthUrl = resolveKakaoOAuthOpenUrl(feed, outlinks, ownerUserId);
  const kakaoProfile = kakaoOAuthUrl && !kakaoOpen ? kakaoOAuthUrl : "";

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
      ? {
          id: "kakao-profile",
          label: firstText(feed.kakaoProfileTitle, "카카오 프로필"),
          url: kakaoProfile,
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
