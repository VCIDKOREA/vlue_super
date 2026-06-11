import { useCallback, useState } from "react";

/** 맞춤법 검사 토글 — 전 회원 무료 */
export function useSpellingCheckMode() {
  const [enabled, setEnabled] = useState(false);

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v;
      console.info("[spelling] toggle", { enabled: next });
      return next;
    });
  }, []);

  return { enabled, setEnabled, toggle };
}
