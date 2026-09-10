import { useEffect, useState } from "react";

/**
 * 폴드 펼침·가로·태블릿 — 앱 셸 와이드 레이아웃 게이트.
 * (min-width: 720px) 또는 (landscape + min-width: 600px)
 */
export function matchWideAppLayout() {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(min-width: 720px)").matches ||
      window.matchMedia("(orientation: landscape) and (min-width: 600px)").matches
    );
  } catch {
    return false;
  }
}

export function useWideAppLayout() {
  const [wide, setWide] = useState(() => matchWideAppLayout());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mqWide = window.matchMedia("(min-width: 720px)");
    const mqLand = window.matchMedia("(orientation: landscape) and (min-width: 600px)");
    const sync = () => setWide(matchWideAppLayout());
    sync();
    mqWide.addEventListener?.("change", sync);
    mqLand.addEventListener?.("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      mqWide.removeEventListener?.("change", sync);
      mqLand.removeEventListener?.("change", sync);
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
