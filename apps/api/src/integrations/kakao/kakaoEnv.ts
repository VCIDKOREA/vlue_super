/**
 * 카카오 OAuth(서버 리다이렉트) 및 REST API 키.
 * Client Secret 은 REST API 키에 묶이므로 OAuth client_id 도 REST API 키를 우선합니다.
 */
export function getKakaoClientId(): string {
  const rest = String(process.env.KAKAO_REST_API_KEY ?? "").trim();
  if (rest) return rest;
  return String(process.env.KAKAO_CLIENT_ID ?? "").trim();
}

/** 따옴표·공백 제거 — Railway 복붙 시 흔한 오류 방지 */
export function getKakaoClientSecret(): string {
  const raw = String(process.env.KAKAO_CLIENT_SECRET ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^['"]|['"]$/g, "").trim();
}

/** 카카오 개발자 콘솔에 등록한 Redirect URI — API 콜백 URL과 바이트 단위 일치 */
export function getKakaoOAuthRedirectUri(): string {
  const explicit = String(process.env.KAKAO_REDIRECT_URI ?? "").trim();
  if (explicit) return explicit;
  const port = String(process.env.PORT ?? "8788").trim();
  return `http://127.0.0.1:${port}/api/v1/auth/kakao/callback`;
}

/** OAuth 완료 후 토큰을 넘길 프론트 오리진 */
export function getFrontendOrigin(): string {
  const explicit = String(process.env.FRONTEND_URL ?? process.env.APP_URL ?? "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const cors = String(process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return cors || "http://localhost:5173";
}
