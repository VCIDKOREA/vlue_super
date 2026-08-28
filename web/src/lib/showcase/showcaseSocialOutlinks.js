import { apiUrl } from "../apiBase.js";
import {
  buildKakaoTalkAddBridgeUrl,
  normalizeKakaoTalkId
} from "../kakao/kakaoPersonalLink.js";

function firstText(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

function normalizeKakaoHttpUrl(raw) {
  const withProto = /^https?:\/\//i.test(raw) ? raw : "";
  const candidate = withProto || (raw.includes(".") ? `https://${raw.replace(/^\/\//, "")}` : "");
  if (!candidate) return "";
  try {
    const u = new URL(candidate);
    const host = u.hostname.toLowerCase();
    if (host === "pf.kakao.com" || host === "open.kakao.com" || host.endsWith(".kakao.com")) {
      return u.href;
    }
  } catch {
    return "";
  }
  return "";
}

/** pf.kakao.com · 채널 ID/검색용 ID → 비즈니스 채널 URL */
export function normalizeKakaoProfilePageUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const asFull = normalizeKakaoHttpUrl(s);
  if (asFull) return asFull;

  if (/^pf\.kakao\.com\//i.test(s) || /^open\.kakao\.com\//i.test(s)) {
    const withProto = normalizeKakaoHttpUrl(`https://${s.replace(/^\/\//, "")}`);
    if (withProto) return withProto;
  }

  // 채널 프로필 ID (예: _ZeUTxl)
  if (/^_[A-Za-z0-9]+$/.test(s)) {
    return `https://pf.kakao.com/${s}`;
  }

  // 채널 검색용 ID (예: @vlue 또는 vlue)
  const searchId = s.replace(/^@+/, "").trim();
  if (searchId && !/[/?#]/.test(searchId)) {
    const encoded = searchId
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    return `https://pf.kakao.com/@${encoded}`;
  }

  return "";
}

export function isKakaoOAuthLinked(feed) {
  if (!feed || typeof feed !== "object") return false;
  if (feed.kakaoVerified === true) return true;
  return Boolean(String(feed.kakaoUserId || "").trim());
}

function resolveKakaoTalkId(feed, outlinks) {
  return normalizeKakaoTalkId(firstText(feed?.kakaoTalkId, outlinks?.kakaoTalkId));
}

function resolveKakaoChannelUrl(feed, outlinks) {
  const legacyKakao = firstText(outlinks.kakao);
  const raw = firstText(
    feed?.kakaoChannelUrl,
    feed?.kakaoProfileUrl,
    feed?.kakaoChannelId,
    outlinks?.kakaoChannel,
    outlinks?.kakaoProfile,
    legacyKakao && !/open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  );
  return normalizeKakaoProfilePageUrl(raw);
}

/**
 * 쇼케이스 비즈니스 쇼셜 아이콘 목록 (인스타·유튜브·카카오 개인/채널 등)
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

  const kakaoTalkId = resolveKakaoTalkId(feed, outlinks);
  const kakaoChannelUrl = resolveKakaoChannelUrl(feed, outlinks);

  const facebook = firstText(outlinks.facebook);
  const youtube = firstText(outlinks.youtube);

  const kakaoPersonalUrl =
    kakaoTalkId
      ? buildKakaoTalkAddBridgeUrl(kakaoTalkId)
      : ownerUserId
        ? apiUrl(`/api/v1/showcase/users/${encodeURIComponent(ownerUserId)}/kakao-profile`)
        : "";

  return [
    ig ? { id: "instagram", label: "Instagram", url: ig, className: "is-ig" } : null,
    youtube ? { id: "youtube", label: "YouTube", url: youtube, className: "is-yt" } : null,
    facebook ? { id: "facebook", label: "Facebook", url: facebook, className: "is-fb" } : null,
    kakaoOpen
      ? { id: "kakao-open", label: "카카오 오픈채팅", url: kakaoOpen, className: "is-kakao" }
      : null,
    kakaoTalkId
      ? {
          id: "kakao-personal",
          label: firstText(feed.kakaoProfileTitle, `@${kakaoTalkId}`, "카카오톡"),
          url: kakaoPersonalUrl,
          talkId: kakaoTalkId,
          className: "is-kakao"
        }
      : null,
    kakaoChannelUrl
      ? {
          id: "kakao-channel",
          label: "카카오 채널",
          url: kakaoChannelUrl,
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
