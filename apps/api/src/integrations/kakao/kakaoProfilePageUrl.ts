/** pf.kakao.com · open.kakao.com · 채널 ID/검색용 ID → 열 수 있는 URL */
export function normalizeKakaoProfilePageUrl(raw: unknown): string {
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

function normalizeKakaoHttpUrl(raw: string): string {
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

/** 쇼케이스 JSON에서 카카오 채널/오픈채팅 URL 추출 */
export function extractKakaoProfilePageUrlFromShowcaseStyle(styleJson: unknown): string {
  if (!styleJson || typeof styleJson !== "object" || Array.isArray(styleJson)) return "";
  const s = styleJson as Record<string, unknown>;
  const feed =
    s.platformFeed && typeof s.platformFeed === "object" && !Array.isArray(s.platformFeed)
      ? (s.platformFeed as Record<string, unknown>)
      : {};
  const commercial =
    s.commercial && typeof s.commercial === "object" && !Array.isArray(s.commercial)
      ? (s.commercial as Record<string, unknown>)
      : {};
  const outlinks =
    commercial.outlinks && typeof commercial.outlinks === "object" && !Array.isArray(commercial.outlinks)
      ? (commercial.outlinks as Record<string, unknown>)
      : {};

  const legacyKakao = String(outlinks.kakao ?? "").trim();
  const candidates = [
    feed.kakaoProfileUrl,
    feed.kakaoChannelId,
    outlinks.kakaoProfile,
    outlinks.kakaoOpenChat,
    /open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : "",
    legacyKakao && !/open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : ""
  ];

  for (const c of candidates) {
    const url = normalizeKakaoProfilePageUrl(c);
    if (url) return url;
  }
  return "";
}
