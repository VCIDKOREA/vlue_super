import { formatWebHref, openExternalHref } from "./showcaseContactActions.js";
import { openKakaoTalkPersonalLink } from "../kakao/kakaoPersonalLink.js";

/** 쇼셜 아이콘 탭 — 개인 카카오톡 ID는 친구추가 딥링크 */
export function openShowcaseSocialItem(item, { onToast } = {}) {
  if (!item || typeof item !== "object") return false;
  if (item.id === "kakao-personal") {
    openKakaoTalkPersonalLink(item.talkId, { onToast });
    return true;
  }
  const href = formatWebHref(item.url) || String(item.url || "").trim();
  if (!href) return false;
  return openExternalHref(href);
}
