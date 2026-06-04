/**
 * 프론트엔드 프로덕션 환경설정 — Vite `import.meta.env` 바인딩·락.
 * 빌드: `vite build` (mode production → `.env.production` 로드)
 */

/** @type {readonly string[]} */
export const FRONTEND_PRODUCTION_ENV_KEYS = ["VITE_API_URL"];

const PLACEHOLDER_RE =
  /^(CHANGE_ME|__SET_|REPLACE_ME|<your-|\$\{)/i;

function isSet(value) {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (PLACEHOLDER_RE.test(v)) return false;
  return true;
}

/**
 * 프로덕션 빌드 시 API 베이스 확인.
 * 동일 오리진 프록시 배포면 VITE_API_URL 비워도 허용.
 */
export function checkFrontendProductionEnv() {
  const mode = String(import.meta.env.MODE || "");
  if (mode !== "production") {
    return { ok: true, mode, warnings: [] };
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  const warnings = [];
  const sameOriginProxy = !isSet(apiUrl);

  if (sameOriginProxy) {
    warnings.push(
      "VITE_API_URL 비움 — 동일 오리진 /api 프록시 배포 전제. 직접 API 호스트 분리 시 URL 필수."
    );
  }

  return {
    ok: true,
    mode,
    apiBase: sameOriginProxy ? "(same-origin /api)" : String(apiUrl).trim().replace(/\/$/, ""),
    warnings
  };
}

export const PRODUCTION_READY_LOG =
  "VLUE AI & CORE SERVICE ENGINE - PRODUCTION READY SUCCESS";

/** 앱 부트 시 1회 호출 (main.jsx) */
export function logProductionEnvBinding() {
  if (import.meta.env.MODE !== "production") return;
  const r = checkFrontendProductionEnv();
  console.info("[vlue-web] Production ENV", {
    VITE_API_URL: r.apiBase,
    warnings: r.warnings
  });
}
