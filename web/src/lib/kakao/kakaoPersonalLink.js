import { apiUrl } from "../apiBase.js";
import { openExternalHref } from "../showcase/showcaseContactActions.js";

/** 카카오톡 친구추가용 ID (4~20자, 영문·숫자·- _ .) */
export function isValidKakaoTalkId(raw) {
  const id = String(raw || "").trim().replace(/^@+/, "");
  return /^[a-zA-Z0-9._-]{4,20}$/.test(id);
}

export function normalizeKakaoTalkId(raw) {
  const id = String(raw || "").trim().replace(/^@+/, "");
  return isValidKakaoTalkId(id) ? id : "";
}

export function buildKakaoTalkAddBridgeUrl(talkId) {
  const id = normalizeKakaoTalkId(talkId);
  if (!id) return "";
  return apiUrl(`/api/v1/showcase/kakao-talk/${encodeURIComponent(id)}/add`);
}

function isAndroidUa() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
}

function isIosUa() {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/** 모바일에서 카카오톡 친구추가 화면으로 열기 시도 */
export function buildKakaoTalkPersonalOpenHref(talkId) {
  const id = normalizeKakaoTalkId(talkId);
  if (!id) return "";
  const bridge = buildKakaoTalkAddBridgeUrl(id);
  const enc = encodeURIComponent(id);

  if (isAndroidUa()) {
    const fallback = encodeURIComponent(bridge);
    return `intent://friend/search?query=${enc}#Intent;scheme=kakaotalk;package=com.kakao.talk;S.browser_fallback_url=${fallback};end`;
  }
  if (isIosUa()) {
    return `kakaotalk://friend/search?query=${enc}`;
  }
  return bridge;
}

export function openKakaoTalkPersonalLink(talkId, { onToast } = {}) {
  const id = normalizeKakaoTalkId(talkId);
  if (!id) {
    onToast?.("카카오톡 ID를 먼저 입력해 주세요.");
    return false;
  }

  const href = buildKakaoTalkPersonalOpenHref(id);
  if (!href) return false;

  try {
    void navigator.clipboard?.writeText?.(id);
  } catch {
    /* ignore */
  }

  try {
    if (/^(intent:|kakaotalk:)/i.test(href)) {
      window.location.href = href;
      return true;
    }
    const opened = openExternalHref(href);
    if (!opened) {
      onToast?.("카카오톡을 열 수 없습니다. ID를 복사했으니 카카오톡에서 직접 검색해 주세요.");
    }
    return opened;
  } catch {
    onToast?.("카카오톡을 열 수 없습니다. ID를 복사했으니 카카오톡에서 직접 검색해 주세요.");
    return false;
  }
}
