/** Vite `.env` 값 — 따옴표 제거 */
export function envTrim(v) {
  if (v == null || typeof v !== "string") return "";
  return v.replace(/^["']|["']$/g, "").trim();
}

/** 포트원 V1 가맹점 식별코드 → `IMP.init(userCode)` */
export function getPortoneUserCode() {
  return envTrim(import.meta.env.VITE_PORTONE_USER_CODE);
}
