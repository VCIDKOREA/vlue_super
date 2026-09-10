/**
 * 폰 가로 회전 차단 게이트.
 * - 짧은 landscape(폰 눕힘) → 세로로 돌려달라는 오버레이
 * - 폴드 펼침·태블릿·PC(세로 폭 ≥720 또는 높이 충분) → 허용, 와이드 레이아웃은 min-width로 처리
 */
export function isPhoneLandscapeBlocked() {
  if (typeof window === "undefined") return false;
  try {
    const landscape = window.matchMedia("(orientation: landscape)").matches;
    if (!landscape) return false;
    /* 데스크톱·넓은 창: 가로여도 스크롤 UI 가능 */
    if (window.matchMedia("(min-height: 640px)").matches) return false;
    /* 폴드 펼침 세로 고정 전제 — 폭만 넓은 경우는 wide로 허용 */
    if (window.matchMedia("(min-width: 720px) and (min-height: 500px)").matches) return false;
    return true;
  } catch {
    return false;
  }
}

export function tryLockPortraitOrientation() {
  if (typeof screen === "undefined" || !screen.orientation?.lock) return;
  try {
    const p = screen.orientation.lock("portrait");
    if (p && typeof p.catch === "function") p.catch(() => undefined);
  } catch {
    /* 브라우저 미지원 — CSS 게이트로 보완 */
  }
}
