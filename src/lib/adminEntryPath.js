/** @param {string | undefined} configured */
export function normalizeAdminPath(configured) {
  return String(configured || "").trim();
}

/**
 * 관리자 비밀 진입 URL — pathname + search 가 .env 의 VITE_ADMIN_PATH 와 완전 일치해야 함.
 * @param {string | undefined} adminPathFromEnv import.meta.env.VITE_ADMIN_PATH
 */
export function isCurrentUrlAdminEntry(adminPathFromEnv) {
  const expected = normalizeAdminPath(adminPathFromEnv);
  if (!expected) return false;
  const current = `${window.location.pathname}${window.location.search}`;
  return current === expected;
}
