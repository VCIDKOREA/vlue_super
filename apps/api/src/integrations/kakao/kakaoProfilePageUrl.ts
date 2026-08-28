/** pf.kakao.com · open.kakao.com 등 카카오 웹 프로필/채널 URL 정규화 */
export function normalizeKakaoProfilePageUrl(raw: unknown): string {
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
