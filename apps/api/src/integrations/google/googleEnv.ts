/**
 * Google OAuth (서버 리다이렉트)
 * Google Cloud Console > OAuth 클라이언트 ID (웹)
 */
export function getGoogleClientId(): string {
  return String(process.env.GOOGLE_CLIENT_ID ?? "").trim();
}

export function getGoogleClientSecret(): string {
  return String(process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
}

/** Console에 등록한 Redirect URI — 바이트 단위 일치 필수 */
export function getGoogleOAuthRedirectUri(): string {
  const explicit = String(process.env.GOOGLE_REDIRECT_URI ?? "").trim();
  if (explicit) return explicit;
  const port = String(process.env.PORT ?? "8788").trim();
  return `http://127.0.0.1:${port}/api/v1/auth/google/callback`;
}
