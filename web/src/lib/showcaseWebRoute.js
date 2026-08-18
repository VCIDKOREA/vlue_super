/** 카카오 버튼용 짧은 공개 경로 — www 도메인, 세그먼트 1단 */
const SHOWCASE_SHORT_PREFIX = "/s/";
/** SMS·외부 공유용 웹 경로 */
const SHOWCASE_SHARE_PREFIX = "/showcase/";
/** 알림톡·기존 공유 경로 */
const SHOWCASE_WEB_PREFIX = "/site/web/showcase/";
const SHOWCASE_WEB_PREFIXES = [SHOWCASE_SHARE_PREFIX, SHOWCASE_SHORT_PREFIX, SHOWCASE_WEB_PREFIX];

function matchesPrefix(pathname, prefix) {
  const p = String(pathname || "");
  const bare = prefix.slice(0, -1);
  const normalized = p.replace(/\/+$/, "") || "/";
  return normalized === bare || p.startsWith(prefix);
}

export function isShowcaseWebRoute(pathname = "") {
  const p = String(pathname || "");
  if (/^\/showcase\/\d{8,15}\/?$/.test(p)) return true;
  return [SHOWCASE_SHORT_PREFIX, SHOWCASE_WEB_PREFIX].some((prefix) => matchesPrefix(p, prefix));
}

/** URL 경로에서 전화번호 파라미터 추출 */
export function parseShowcasePhoneFromPath(pathname = "") {
  const p = String(pathname || "");
  for (const prefix of SHOWCASE_WEB_PREFIXES) {
    if (!p.startsWith(prefix)) continue;
    const raw = p.slice(prefix.length).replace(/\/$/, "");
    if (!raw) return "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }
  return "";
}

function localPhoneDigits(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.startsWith("82") ? `0${digits.slice(2)}` : digits;
}

/** 카카오·문자 등 외부 공유용 웹 경로 `/showcase/010…` */
export function showcaseWebPathForPhone(phone) {
  const local = localPhoneDigits(phone);
  return `${SHOWCASE_SHARE_PREFIX}${encodeURIComponent(local || "")}`;
}

/** 알림톡 버튼용 짧은 경로 `/s/010…` */
export function showcaseWebShortPathForPhone(phone) {
  const local = localPhoneDigits(phone);
  return `${SHOWCASE_SHORT_PREFIX}${encodeURIComponent(local || "")}`;
}

/** 알림톡·OG 랜딩이 보내는 기존 SPA 경로 */
export function showcaseWebLongPathForPhone(phone) {
  const local = localPhoneDigits(phone);
  return `${SHOWCASE_WEB_PREFIX}${encodeURIComponent(local || "")}`;
}
