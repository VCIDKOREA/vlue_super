import { postFamilyHeartbeat } from "./familyProtectionApi.js";

let started = false;

/** 로그인 후 앱 실행·포그라운드 복귀 시에만 접속 기록 (5분 주기 없음) */
export function startFamilyProtectionPresence() {
  if (started || typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  started = true;

  const ping = () => {
    postFamilyHeartbeat().catch(() => {});
  };

  ping();

  const onVisible = () => {
    if (document.visibilityState === "visible") ping();
  };

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", ping);

  return () => {
    started = false;
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", ping);
  };
}
