/**
 * 카카오 OAuth(서버 리다이렉트) 및 REST API 키.
 * KAKAO_CLIENT_ID 가 없으면 기존 KAKAO_REST_API_KEY 를 사용합니다.
 */
export function getKakaoClientId(): string {
  return String(process.env.KAKAO_CLIENT_ID ?? process.env.KAKAO_REST_API_KEY ?? "").trim();
}

export function getKakaoClientSecret(): string {
  return String(process.env.KAKAO_CLIENT_SECRET ?? "").trim();
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
