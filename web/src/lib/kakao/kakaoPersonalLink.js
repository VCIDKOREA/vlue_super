/** 카카오톡 개인 ID — 복사 토스트 → 카카오톡 친구검색 직행 */

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

function openViaNativeBridge(url) {
  const u = String(url || "").trim();
  if (!u || typeof window === "undefined") return false;
  try {
    if (typeof window.Android?.openExternalUrl === "function") {
      window.Android.openExternalUrl(u);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof window.VlueLettering?.openUrl === "function") {
      window.VlueLettering.openUrl(u);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** 카카오톡 앱 열기 (친구 ID 검색 화면 시도, Play 스토어 폴백 없음) */
export function launchKakaoTalkForFriendAdd(talkId) {
  const id = normalizeKakaoTalkId(talkId);
  if (!id || typeof window === "undefined") return false;

  const enc = encodeURIComponent(id);
  const schemeHref = `kakaotalk://friend/search?query=${enc}`;
  const intentHref =
    `intent://friend/search?query=${enc}` +
    "#Intent;scheme=kakaotalk;package=com.kakao.talk;end";

  // WebView에 kakaotalk:// 을 load하면 ERR_UNKNOWN_URL_SCHEME — 네이티브 브릿지 우선
  if (openViaNativeBridge(intentHref) || openViaNativeBridge(schemeHref)) {
    return true;
  }

  if (isAndroidUa()) {
    try {
      window.location.assign(intentHref);
      return true;
    } catch {
      try {
        window.location.assign(schemeHref);
        return true;
      } catch {
        return false;
      }
    }
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

/** 모바일에서 토스트가 잠깐 보이도록 한 뒤 앱 전환 */
const KAKAO_LAUNCH_DELAY_MS = 360;

/**
 * 쇼셜 아이콘 탭 — ID 복사 토스트 → (모바일) 카카오톡 친구 ID 검색 화면 직행
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

  if (!isMobileUa()) {
    onToast?.(
      `${label}님의 카카오톡 ID가 복사되었습니다. PC에서는 카카오톡 앱을 열 수 없습니다. 모바일 카카오톡에서 친구 추가 → ID로 추가를 이용해 주세요.`
    );
    return true;
  }

  onToast?.(`${label}님의 카카오톡 ID가 복사되었습니다.`);

  window.setTimeout(() => {
    launchKakaoTalkForFriendAdd(id);
  }, KAKAO_LAUNCH_DELAY_MS);
  return true;
}

/** @deprecated promptKakaoTalkPersonalLink 사용 */
export async function openKakaoTalkPersonalLink(talkId, opts = {}) {
  return promptKakaoTalkPersonalLink(talkId, opts);
}
