/**
 * Instagram API with Instagram Login — Meta App Dashboard > Instagram > Business login settings
 */
export function getInstagramAppId(): string {
  return String(process.env.INSTAGRAM_APP_ID ?? "").trim();
}

export function getInstagramAppSecret(): string {
  return String(process.env.INSTAGRAM_APP_SECRET ?? "").trim();
}

/** Meta에 등록한 OAuth Redirect URI — 바이트 단위 일치 필수 (끝 슬래시 제거) */
export function getInstagramOAuthRedirectUri(): string {
  const explicit = String(process.env.INSTAGRAM_REDIRECT_URI ?? "").trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const port = String(process.env.PORT ?? "8788").trim();
  return `http://127.0.0.1:${port}/api/v1/auth/instagram/callback`;
}
