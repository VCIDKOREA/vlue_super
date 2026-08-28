/** 카카오톡 친구추가용 ID (OAuth 회원번호와 별개) */
export function isValidKakaoTalkId(raw: unknown): boolean {
  const id = String(raw ?? "").trim().replace(/^@+/, "");
  return /^[a-zA-Z0-9._-]{4,20}$/.test(id);
}

export function normalizeKakaoTalkId(raw: unknown): string {
  const id = String(raw ?? "").trim().replace(/^@+/, "");
  return isValidKakaoTalkId(id) ? id : "";
}

export function buildKakaoTalkAddBridgePath(talkId: string): string {
  const id = normalizeKakaoTalkId(talkId);
  if (!id) return "";
  return `/api/v1/showcase/kakao-talk/${encodeURIComponent(id)}/add`;
}

/** 쇼케이스 JSON에서 카카오톡 친구추가 ID 추출 */
export function extractKakaoTalkIdFromShowcaseStyle(styleJson: unknown): string {
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
  return normalizeKakaoTalkId(feed.kakaoTalkId ?? outlinks.kakaoTalkId);
}
