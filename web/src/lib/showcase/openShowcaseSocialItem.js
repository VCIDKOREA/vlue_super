import { formatWebHref, openExternalHref } from "./showcaseContactActions.js";
import { promptKakaoTalkPersonalLink } from "../kakao/kakaoPersonalLink.js";

/** 쇼셜 아이콘 탭 — 개인 카카오톡 ID는 복사 토스트 후 친구검색 화면 직행 */
export function openShowcaseSocialItem(item, { onToast, ownerDisplayName } = {}) {
  if (!item || typeof item !== "object") return false;
  if (item.id === "kakao-personal") {
    void promptKakaoTalkPersonalLink(item.talkId, {
      onToast,
      ownerName: ownerDisplayName || item.ownerName || item.label
    });
    return true;
  }
  const href = formatWebHref(item.url) || String(item.url || "").trim();
  if (!href) return false;
  return openExternalHref(href);
}
