/**
 * 소셜 CDN 프로필 사진 URL 정규화 + 허용 호스트 프록시
 * (카카오 http→https, 핫링크 차단 우회)
 */

const ALLOWED_HOST_SUFFIXES = [
  "kakaocdn.net",
  "kakao.co.kr",
  "daumcdn.net",
  "pstatic.net",
  "naver.net",
  "googleusercontent.com",
  "ggpht.com",
  "gstatic.com",
  "cdninstagram.com",
  "fbcdn.net",
  "facebook.com",
  "fbsbx.com",
  "vlue.kr"
];

export function normalizeSocialPhotoUrl(raw: string | null | undefined): string {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("data:image/")) return s;
  /* 프로토콜 상대 //cdn... */
  if (s.startsWith("//")) s = `https:${s}`;
  /* 카카오·네이버 등 http 혼용 → https (혼합 콘텐츠/차단 방지) */
  if (/^http:\/\//i.test(s)) s = `https://${s.slice(7)}`;
  if (!/^https:\/\//i.test(s)) return "";
  try {
    const u = new URL(s);
    if (!isAllowedSocialPhotoHost(u.hostname)) return s;
    return u.toString();
  } catch {
    return "";
  }
}

export function isAllowedSocialPhotoHost(hostname: string): boolean {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!host) return false;
  return ALLOWED_HOST_SUFFIXES.some((suf) => host === suf || host.endsWith(`.${suf}`));
}

/** 브라우저 <img> 용 — 우리 API 프록시 경로 (상대) */
export function toSocialPhotoProxyPath(raw: string | null | undefined): string {
  const normalized = normalizeSocialPhotoUrl(raw);
  if (!normalized || normalized.startsWith("data:image/")) return normalized;
  try {
    const host = new URL(normalized).hostname;
    if (!isAllowedSocialPhotoHost(host)) return normalized;
    /* 이미 우리 호스트면 그대로 */
    if (host === "api.vlue.kr" || host.endsWith(".vlue.kr")) return normalized;
  } catch {
    return "";
  }
  return `/api/app/social-avatar?u=${encodeURIComponent(normalized)}`;
}

export function resolveDisplaySocialPhotoUrl(raw: string | null | undefined): string {
  const normalized = normalizeSocialPhotoUrl(raw);
  if (!normalized) return "";
  if (normalized.startsWith("data:image/")) return normalized;
  return toSocialPhotoProxyPath(normalized) || normalized;
}
