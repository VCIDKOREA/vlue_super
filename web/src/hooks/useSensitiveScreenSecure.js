import { useEffect } from "react";
import { acquireSensitiveScreenSecure, releaseSensitiveScreenSecure } from "../lib/screenSecure.js";

/** 민감 콘텐츠 화면이 열려 있는 동안만 스크린 캡처 차단 */
export function useSensitiveScreenSecure(active) {
  useEffect(() => {
    if (!active) return undefined;
    acquireSensitiveScreenSecure();
    return () => releaseSensitiveScreenSecure();
  }, [active]);
}
