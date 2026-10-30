/** 5-Way 프로필 슬롯 + 상대방 표기 방식 (실명/닉네임) */

import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { getLegalName, scrubBrandDisplayName, VLUE_NICKNAME_MAX } from "./memberCardStorage.js";
import { writeProfilePhoto, readProfilePhotoAvatar } from "./vlueAvatar.js";

const CACHE_KEY = "vlue_five_way_profile_v1";
const MODE_KEY = "vlue_display_name_mode";
const SOURCE_KEY = "vlue_active_profile_source";
const ACTIVE_NICK_KEY = "vlue_active_profile_nickname";
const CHANGED_EVENT = "vlue-five-way-profile-changed";

export const FIVE_WAY_SOURCES = [
  { id: "kakao", label: "카카오" },
  { id: "naver", label: "네이버" },
  { id: "google", label: "구글" },
  { id: "instagram", label: "인스타그램" },
  { id: "vlue", label: "VLUE 프로필" }
];

export function readCachedFiveWayProfile() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedFiveWayProfile(state) {
  try {
    if (!state) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    if (state.displayNameMode) localStorage.setItem(MODE_KEY, state.displayNameMode);
    if (state.activeProfileSource) localStorage.setItem(SOURCE_KEY, state.activeProfileSource);
    if (state.activeNickname != null) {
      localStorage.setItem(ACTIVE_NICK_KEY, String(state.activeNickname || "").slice(0, VLUE_NICKNAME_MAX));
    }
  } catch {
    /* ignore */
  }
}

/** 상대방·앱 전역 소프트 표기명 — DCC/명함 실명과 분리 */
export function getPublicDisplayName(fallbackName = "") {
  try {
    const mode = String(localStorage.getItem(MODE_KEY) || "nickname").toLowerCase();
    const legal = scrubBrandDisplayName(getLegalName());
    const nick = scrubBrandDisplayName(localStorage.getItem(ACTIVE_NICK_KEY) || "");
    if (mode === "legal" && legal) return legal;
    if (nick) return nick;
    if (legal) return legal;
    const fb = scrubBrandDisplayName(fallbackName);
    return fb || "회원";
  } catch {
    return scrubBrandDisplayName(fallbackName) || "회원";
  }
}

export function getDisplayNameMode() {
  try {
    return String(localStorage.getItem(MODE_KEY) || "nickname").toLowerCase() === "legal"
      ? "legal"
      : "nickname";
  } catch {
    return "nickname";
  }
}

/** 상대 프록시 경로·CDN URL → 브라우저에서 바로 쓸 절대 URL */
export function resolveFiveWayPhotoSrc(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("data:image/")) return s;
  if (s.startsWith("/api/")) return apiUrl(s);
  if (/^https?:\/\//i.test(s)) {
    /* 소셜 CDN은 API 프록시로 우회 (핫링크·http 혼합 차단) */
    try {
      const host = new URL(s).hostname.toLowerCase();
      if (
        /kakaocdn\.net$|kakao\.co\.kr$|daumcdn\.net$|pstatic\.net$|googleusercontent\.com$|cdninstagram\.com$|fbcdn\.net$/i.test(
          host
        ) ||
        host.endsWith(".kakaocdn.net") ||
        host.endsWith(".pstatic.net") ||
        host.endsWith(".googleusercontent.com") ||
        host.endsWith(".cdninstagram.com") ||
        host.endsWith(".fbcdn.net")
      ) {
        return apiUrl(`/api/app/social-avatar?u=${encodeURIComponent(s.replace(/^http:\/\//i, "https://"))}`);
      }
    } catch {
      /* fall through */
    }
    return s;
  }
  return "";
}

/** 서버 상태 → 로컬 아바타·닉 즉시 반영 (DCC 실명 필드는 건드리지 않음) */
export function applyFiveWayProfileLocally(state) {
  if (!state || typeof state !== "object") return;
  const normalized = normalizeFiveWayState(state);
  writeCachedFiveWayProfile(normalized);
  const photo = String(normalized.activePhotoUrl || "").trim();
  if (photo && (/^https?:\/\//i.test(photo) || photo.startsWith("data:image/"))) {
    try {
      const current = readProfilePhotoAvatar();
      if (current !== photo) writeProfilePhoto(photo);
    } catch {
      /* ignore */
    }
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: normalized }));
    window.dispatchEvent(new Event("vlue-nicknames-changed"));
  } catch {
    /* ignore */
  }
}

function normalizeFiveWayState(state) {
  if (!state || typeof state !== "object") return state;
  const slots = Array.isArray(state.slots)
    ? state.slots.map((slot) => ({
        ...slot,
        photoUrl: resolveFiveWayPhotoSrc(slot?.photoUrl) || String(slot?.photoUrl || "").trim()
      }))
    : state.slots;
  const activePhotoUrl =
    resolveFiveWayPhotoSrc(state.activePhotoUrl) || String(state.activePhotoUrl || "").trim();
  return { ...state, slots, activePhotoUrl };
}

export async function fetchFiveWayProfile() {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/profile/display"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "프로필 표시 정보를 불러오지 못했습니다.");
  }
  const normalized = normalizeFiveWayState(data);
  applyFiveWayProfileLocally(normalized);
  return normalized;
}

export async function patchFiveWayProfile(body) {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/profile/display"), {
    method: "PATCH",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "프로필 표시 설정에 실패했습니다.");
  }
  const normalized = normalizeFiveWayState(data);
  applyFiveWayProfileLocally(normalized);
  return normalized;
}

export { CHANGED_EVENT as FIVE_WAY_PROFILE_CHANGED_EVENT };
