const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;

/**
 * 모바일 웹/앱 브라우저 여부 (PC 데스크탑은 false).
 * userAgent 우선, 터치·좁은 뷰포트는 보조 신호로 사용합니다.
 */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  if (MOBILE_UA_RE.test(ua)) return true;

  if (typeof window !== "undefined" && window.matchMedia) {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 899px)").matches;
    if (coarse && narrow) return true;
  }

  return false;
}
