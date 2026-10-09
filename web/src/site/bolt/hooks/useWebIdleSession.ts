import { useCallback, useEffect, useRef, useState } from "react";
import {
  WEB_IDLE_WARN_MS,
  bumpWebIdleActivity,
  clearWebIdleSession,
  formatIdleMmSs,
  readWebIdleLastAt,
  remainingWebIdleMs
} from "../../../lib/webIdleSession.js";
import { isNativeVlueClient } from "../../../lib/siteMode.js";

type Opts = {
  enabled: boolean;
  onTimeout: () => void | Promise<void>;
};

/**
 * 브라우저(www) 로그인만 30분 유휴 로그아웃.
 * 앱(Android·iOS·PC 설치형)은 이 타이머를 쓰지 않고 로그인을 유지한다.
 * 클릭·키·터치·해시 이동 시 30분 연장. 남은 4:59부터 표시.
 */
export function useWebIdleSession({ enabled, onTimeout }: Opts) {
  const nativeApp = isNativeVlueClient();
  const active = enabled && !nativeApp;
  const [remainingMs, setRemainingMs] = useState(() => remainingWebIdleMs());
  const onTimeoutRef = useRef(onTimeout);
  const armedRef = useRef(false);
  const timedOutRef = useRef(false);
  onTimeoutRef.current = onTimeout;

  const bump = useCallback(() => {
    if (!active) return;
    bumpWebIdleActivity();
    setRemainingMs(remainingWebIdleMs());
  }, [active]);

  useEffect(() => {
    if (nativeApp) {
      armedRef.current = false;
      timedOutRef.current = false;
      return undefined;
    }
    if (!enabled) {
      armedRef.current = false;
      timedOutRef.current = false;
      clearWebIdleSession();
      setRemainingMs(0);
      return undefined;
    }

    timedOutRef.current = false;

    if (!armedRef.current) {
      /* 다시 열 때 먼저 연장하면 어제 시각이 지워져 30분이 처음부터 다시 센다 */
      const last = readWebIdleLastAt();
      if (last > 0 && remainingWebIdleMs() <= 0) {
        timedOutRef.current = true;
        armedRef.current = false;
        clearWebIdleSession();
        setRemainingMs(0);
        void onTimeoutRef.current();
        return undefined;
      }
      bumpWebIdleActivity();
      armedRef.current = true;
    }
    setRemainingMs(remainingWebIdleMs());

    let lastBump = 0;
    const onActivity = () => {
      if (timedOutRef.current) return;
      const now = Date.now();
      if (now - lastBump < 400) return;
      lastBump = now;
      bumpWebIdleActivity(now);
      setRemainingMs(remainingWebIdleMs(now));
    };

    const fireTimeoutIfExpired = () => {
      if (timedOutRef.current) return;
      const left = remainingWebIdleMs();
      setRemainingMs(left);
      if (left <= 0) {
        timedOutRef.current = true;
        armedRef.current = false;
        clearWebIdleSession();
        void onTimeoutRef.current();
      }
    };

    const tick = () => {
      fireTimeoutIfExpired();
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      fireTimeoutIfExpired();
    };

    window.addEventListener("click", onActivity, true);
    window.addEventListener("keydown", onActivity, true);
    window.addEventListener("touchstart", onActivity, { capture: true, passive: true });
    window.addEventListener("hashchange", onActivity);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);
    const id = window.setInterval(tick, 1000);
    tick();

    return () => {
      window.removeEventListener("click", onActivity, true);
      window.removeEventListener("keydown", onActivity, true);
      window.removeEventListener("touchstart", onActivity, true);
      window.removeEventListener("hashchange", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.clearInterval(id);
    };
  }, [enabled, nativeApp]);

  const warning = active && remainingMs > 0 && remainingMs <= WEB_IDLE_WARN_MS;
  const label = formatIdleMmSs(remainingMs);

  return { remainingMs, warning, label, bump };
}
