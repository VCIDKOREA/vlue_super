/** 카카오톡 개인 ID — 복사 후 확인 팝업 → 앱 열기 */

/** 카카오톡 친구추가용 ID (4~20자, 영문·숫자·- _ .) */
export function isValidKakaoTalkId(raw) {
  const id = String(raw || "").trim().replace(/^@+/, "");
  return /^[a-zA-Z0-9._-]{4,20}$/.test(id);
}

export function normalizeKakaoTalkId(raw) {
  const id = String(raw || "").trim().replace(/^@+/, "");
  return isValidKakaoTalkId(id) ? id : "";
}

function isAndroidUa() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
}

function isIosUa() {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function isMobileUa() {
  return isAndroidUa() || isIosUa();
}

export async function copyKakaoTalkIdToClipboard(talkId) {
  const id = normalizeKakaoTalkId(talkId);
  if (!id) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(id);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = id;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** 카카오톡 앱 열기 (친구 ID 검색 화면 시도, Play 스토어 폴백 없음) */
export function launchKakaoTalkForFriendAdd(talkId) {
  const id = normalizeKakaoTalkId(talkId);
  if (!id || typeof window === "undefined") return false;

  const enc = encodeURIComponent(id);
  const schemeHref = `kakaotalk://friend/search?query=${enc}`;

  if (isAndroidUa()) {
    try {
      window.location.assign(schemeHref);
      return true;
    } catch {
      /* intent without store fallback */
    }
    const intent =
      `intent://friend/search?query=${enc}` +
      "#Intent;scheme=kakaotalk;package=com.kakao.talk;end";
    window.location.assign(intent);
    return true;
  }

  if (isIosUa()) {
    window.location.assign(schemeHref);
    return true;
  }

  return false;
}

function resolveOwnerLabel(ownerName) {
  const name = String(ownerName || "").trim();
  return name || "상대";
}

/**
 * 쇼셜 아이콘 탭 — ID 복사 → 확인 → 카카오톡 열기
 * @returns {Promise<boolean>}
 */
export async function promptKakaoTalkPersonalLink(talkId, { ownerName, onToast } = {}) {
  const id = normalizeKakaoTalkId(talkId);
  if (!id) {
    onToast?.("카카오톡 ID를 먼저 입력해 주세요.");
    return false;
  }

  const label = resolveOwnerLabel(ownerName);
  const copied = await copyKakaoTalkIdToClipboard(id);
  if (!copied) {
    onToast?.("카카오톡 ID 복사에 실패했습니다.");
    return false;
  }

  const go = window.confirm(
    `${label}님의 카카오톡 ID가 복사되었습니다.\n카카오톡으로 이동하시겠습니까?`
  );
  if (!go) return true;

  if (!isMobileUa()) {
    onToast?.("모바일에서 카카오톡 앱으로 열어 주세요. ID는 복사되었습니다.");
    return true;
  }

  launchKakaoTalkForFriendAdd(id);
  return true;
}

/** @deprecated promptKakaoTalkPersonalLink 사용 */
export async function openKakaoTalkPersonalLink(talkId, opts = {}) {
  return promptKakaoTalkPersonalLink(talkId, opts);
}
