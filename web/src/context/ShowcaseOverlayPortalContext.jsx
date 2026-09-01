import { createContext, useContext } from "react";

/** www 쇼케이스 미리보기 열 — 좋아요·댓글 시트를 틀 안에 띄울 때 사용 */
export const ShowcaseOverlayPortalContext = createContext(null);

export function useShowcaseOverlayPortal() {
  return useContext(ShowcaseOverlayPortalContext);
}
