import { useEffect, useState } from "react";

/**
 * 폴드 펼침·태블릿·PC — 앱 셸 와이드 레이아웃 게이트.
 * 가로(landscape) 회전은 지원하지 않음. 넓은 세로(min-width)만 와이드로 취급.
 */
export function matchWideAppLayout() {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(min-width: 720px)").matches;
  } catch {
    return false;
  }
}

export function useWideAppLayout() {
  const [wide, setWide] = useState(() => matchWideAppLayout());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mqWide = window.matchMedia("(min-width: 720px)");
    const sync = () => setWide(matchWideAppLayout());
    sync();
    mqWide.addEventListener?.("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      mqWide.removeEventListener?.("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    try {
      document.documentElement.classList.toggle("vlue-wide-layout", wide);
      document.documentElement.dataset.vlueWide = wide ? "1" : "0";
    } catch {
      /* ignore */
    }
  }, [wide]);

  return wide;
}
