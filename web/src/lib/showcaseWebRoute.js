const SHOWCASE_WEB_PREFIX = "/site/web/showcase/";

export function isShowcaseWebRoute(pathname = "") {
  const p = typeof pathname === "string" ? pathname : "";
  return p === SHOWCASE_WEB_PREFIX.slice(0, -1) || p.startsWith(SHOWCASE_WEB_PREFIX);
}

/** URL 경로에서 전화번호 파라미터 추출 */
export function parseShowcasePhoneFromPath(pathname = "") {
  const p = String(pathname || "");
  if (!p.startsWith(SHOWCASE_WEB_PREFIX)) return "";
  const raw = p.slice(SHOWCASE_WEB_PREFIX.length).replace(/\/$/, "");
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export function showcaseWebPathForPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  const local = digits.startsWith("82") ? `0${digits.slice(2)}` : digits;
  return `${SHOWCASE_WEB_PREFIX}${encodeURIComponent(local || "")}`;
}
