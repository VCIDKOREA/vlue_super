/** 네이버 OAuth (서버 리다이렉트) 환경설정 */
export function getNaverClientId(): string {
  return String(process.env.NAVER_OAUTH_CLIENT_ID ?? "").trim();
}

export function getNaverClientSecret(): string {
  return String(process.env.NAVER_OAUTH_CLIENT_SECRET ?? "").trim();
}

/** 네이버 개발자센터에 등록한 Callback URL과 정확히 일치해야 한다. */
export function getNaverOAuthRedirectUri(): string {
  const explicit = String(process.env.NAVER_REDIRECT_URI ?? "").trim();
  if (explicit) return explicit;
  const port = String(process.env.PORT ?? "8788").trim();
  return `http://127.0.0.1:${port}/api/v1/auth/naver/callback`;
}
