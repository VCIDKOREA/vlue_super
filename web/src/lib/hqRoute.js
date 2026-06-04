const HQ_PATH = "/super-admin-hq";

export function getSuperAdminHqPath() {
  return HQ_PATH;
}

export function isSuperAdminHqEntry() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === HQ_PATH || window.location.pathname === `${HQ_PATH}/`;
}
