/** www 마케팅 웹 — 로그인 후 미사용 시 자동 로그아웃 */

export const WEB_IDLE_LIMIT_MS = 30 * 60 * 1000;
/** 남은 시간 4:59부터 헤더에 타이머 표시 */
export const WEB_IDLE_WARN_MS = 4 * 60 * 1000 + 59 * 1000;
export const WEB_IDLE_STORAGE_KEY = "vlue_web_idle_last_at";

export function readWebIdleLastAt() {
  try {
    const n = Number(localStorage.getItem(WEB_IDLE_STORAGE_KEY) || "");
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function bumpWebIdleActivity(now = Date.now()) {
  try {
    localStorage.setItem(WEB_IDLE_STORAGE_KEY, String(now));
  } catch {
    /* ignore */
  }
  return now;
}

export function clearWebIdleSession() {
  try {
    localStorage.removeItem(WEB_IDLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function remainingWebIdleMs(now = Date.now()) {
  const last = readWebIdleLastAt();
  if (!last) return WEB_IDLE_LIMIT_MS;
  return Math.max(0, WEB_IDLE_LIMIT_MS - (now - last));
}

export function formatIdleMmSs(ms) {
  const sec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
