import { useCallback, useEffect, useRef, useState } from "react";
import {
  WEB_IDLE_WARN_MS,
  bumpWebIdleActivity,
  clearWebIdleSession,
  formatIdleMmSs,
  remainingWebIdleMs
} from "../../../lib/webIdleSession.js";

type Opts = {
  enabled: boolean;
  onTimeout: () => void | Promise<void>;
};

/**
 * 웹 로그인 세션 유휴 타이머.
 * 클릭·키·터치·해시 이동 시 30분 연장. 남은 4:59부터 표시.
 */
export function useWebIdleSession({ enabled, onTimeout }: Opts) {
  const [remainingMs, setRemainingMs] = useState(() => remainingWebIdleMs());
  const onTimeoutRef = useRef(onTimeout);
  const armedRef = useRef(false);
  const timedOutRef = useRef(false);
  onTimeoutRef.current = onTimeout;

  const bump = useCallback(() => {
    if (!enabled) return;
    bumpWebIdleActivity();
    setRemainingMs(remainingWebIdleMs());
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      armedRef.current = false;
      timedOutRef.current = false;
      clearWebIdleSession();
      setRemainingMs(0);
      return undefined;
    }

    timedOutRef.current = false;

    if (!armedRef.current) {
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

    const tick = () => {
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

    window.addEventListener("click", onActivity, true);
    window.addEventListener("keydown", onActivity, true);
    window.addEventListener("touchstart", onActivity, { capture: true, passive: true });
    window.addEventListener("hashchange", onActivity);
    const id = window.setInterval(tick, 1000);
    tick();

    return () => {
      window.removeEventListener("click", onActivity, true);
      window.removeEventListener("keydown", onActivity, true);
      window.removeEventListener("touchstart", onActivity, true);
      window.removeEventListener("hashchange", onActivity);
      window.clearInterval(id);
    };
  }, [enabled]);

  const warning = enabled && remainingMs > 0 && remainingMs <= WEB_IDLE_WARN_MS;
  const label = formatIdleMmSs(remainingMs);

  return { remainingMs, warning, label, bump };
}
