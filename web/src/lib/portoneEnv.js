/** Vite `.env` 값 — 따옴표 제거 */
export function envTrim(v) {
  if (v == null || typeof v !== "string") return "";
  return v.replace(/^["']|["']$/g, "").trim();
}

/** 포트원 V1 가맹점 식별코드 → `IMP.init(userCode)` */
export function getPortoneUserCode() {
  return envTrim(import.meta.env.VITE_PORTONE_USER_CODE);
}

/**
 * 포트원 테스트 모드 (네이버페이/실MID 승인 전).
 * `VITE_PORTONE_TEST_MODE=true` 이면 결제 버튼이 서버 테스트 우회 → Premium 부여.
 * 승인 후 false로 끄고 실 PG만 사용.
 */
export function isPortoneTestMode() {
  const raw = envTrim(import.meta.env.VITE_PORTONE_TEST_MODE).toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  // 로컬 dev는 항상 테스트 가능
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) return true;
  return false;
}
