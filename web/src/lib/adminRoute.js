import { isCurrentUrlAdminEntry, normalizeAdminPath } from "./adminEntryPath.js";
import { isMarketingHost } from "./siteMode.js";

/** 로컬 개발 전용 — 프로덕션(vlue.kr)에서는 절대 사용하지 않음 */
const LOCAL_ADMIN_CONSOLE_PATH = "/admin";

/** 프로덕션에서 차단할 예측 가능한 경로 */
const BLOCKED_PRODUCTION_PREFIXES = ["/admin", "/administrator", "/manage", "/dashboard"];

function isLocalDevHost(hostname = "") {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || /^192\.168\.\d+\.\d+$/.test(h);
}

function isProductionVlueHost(hostname = "") {
  return isMarketingHost(hostname) || String(hostname || "").toLowerCase() === "api.vlue.kr";
}

/**
 * 현재 환경에서 관리자 콘솔 진입에 쓰는 전체 경로(pathname + search).
 * - 로컬: /admin
 * - vlue.kr 등 프로덕션: VITE_ADMIN_CONSOLE_PATH (복잡한 비밀 경로)
 */
export function getAdminConsolePath() {
  if (typeof window === "undefined") return "";
  if (isLocalDevHost(window.location.hostname)) return LOCAL_ADMIN_CONSOLE_PATH;
  return normalizeAdminPath(import.meta.env.VITE_ADMIN_CONSOLE_PATH);
}

function isBlockedProductionPath(pathname = "") {
  const p = String(pathname || "");
  return BLOCKED_PRODUCTION_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

/**
 * 관리자 JWT 콘솔(AdminConsoleApp) 진입 여부.
 * vlue.kr 에서 /admin 은 항상 false — 비밀 경로만 허용.
 */
export function isAdminConsoleEntry() {
  if (typeof window === "undefined") return false;

  const { pathname, hostname } = window.location;
  const local = isLocalDevHost(hostname);
  const production = isProductionVlueHost(hostname);

  if (!local && isBlockedProductionPath(pathname)) return false;

  const expected = getAdminConsolePath();
  if (!expected) return false;

  if (local && expected === LOCAL_ADMIN_CONSOLE_PATH) {
    return pathname === LOCAL_ADMIN_CONSOLE_PATH || pathname.startsWith(`${LOCAL_ADMIN_CONSOLE_PATH}/`);
  }

  if (production) {
    return isCurrentUrlAdminEntry(expected);
  }

  return isCurrentUrlAdminEntry(expected);
}

/** 문서·디버그용 — 현재 호스트에서 권장 진입 방식 */
export function describeAdminConsoleEntry() {
  if (typeof window === "undefined") return { mode: "ssr", path: "" };
  const local = isLocalDevHost(window.location.hostname);
  const path = getAdminConsolePath();
  if (local) {
    return {
      mode: "local",
      path,
      hint: "로컬에서는 localhost 전용 /admin 이 가장 안전합니다. 외부에 노출되지 않습니다."
    };
  }
  if (!path) {
    return {
      mode: "blocked",
      path: "",
      hint: "프로덕션: VITE_ADMIN_CONSOLE_PATH 를 빌드 시 설정하세요. /admin 은 사용할 수 없습니다."
    };
  }
  return {
    mode: "secret",
    path,
    hint: "프로덕션: 비밀 전체 URL(pathname+search)로만 진입. /admin 은 차단됩니다."
  };
}
