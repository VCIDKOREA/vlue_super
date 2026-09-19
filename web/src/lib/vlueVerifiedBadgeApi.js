import { vlueAuthFetch } from "./vlueAuthHeaders.js";

const STORAGE_KEY = "vlue_verified_badge_v1";
const SHARE_COUNT_KEY = "vlue_showcase_share_count_v1";
const CHANGED_EVENT = "vlue-verified-badge-changed";

export function readVlueVerifiedBadgeLocal() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function readShowcaseShareCountLocal() {
  try {
    const n = Number(localStorage.getItem(SHARE_COUNT_KEY) || "");
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeVlueBadgeLocal({ vlueVerifiedBadge, showcaseShareCount } = {}) {
  try {
    if (typeof vlueVerifiedBadge === "boolean") {
      localStorage.setItem(STORAGE_KEY, vlueVerifiedBadge ? "1" : "0");
    }
    if (Number.isFinite(Number(showcaseShareCount)) && Number(showcaseShareCount) >= 0) {
      localStorage.setItem(SHARE_COUNT_KEY, String(Math.floor(Number(showcaseShareCount))));
    }
    window.dispatchEvent(new Event(CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * 청록 인증 실(seal) 표시 여부.
 * @param {{ vlueVerifiedBadge?: boolean|null, allowLocalFallback?: boolean }} ctx
 * - allowLocalFallback: 기본 true — **본인** 쇼케이스/미리보기만.
 *   상대(피어) 통화·빅푸시에서는 false 로 두고, 카드의 명시적 배지만 본다.
 */
export function shouldShowVlueVerifiedSeal(ctx = {}) {
  if (ctx.vlueVerifiedBadge === true) return true;
  if (ctx.vlueVerifiedBadge === false) return false;
  if (ctx.allowLocalFallback === false) return false;
  const local = readVlueVerifiedBadgeLocal();
  if (local === true) return true;
  return false;
}

/**
 * 상대 통화·빅푸시·피어 오버레이용.
 * 수신자 localStorage 배지를 절대 쓰지 않음. VLUÉ 회원(verified) + 상대 카드 배지만.
 */
export function shouldShowPeerVlueVerifiedSeal({
  verified = false,
  vlueVerifiedBadge = null,
  profileKind = "",
  contactSafeCare = false
} = {}) {
  if (!verified) return false;
  const kind = String(profileKind || "").trim();
  if (
    contactSafeCare ||
    kind === "contact_safe_care" ||
    kind === "public_directory_safe" ||
    kind === "unverified" ||
    kind === "lookup_pending" ||
    kind === "expired_line" ||
    kind === "admob_sponsor"
  ) {
    return false;
  }
  return vlueVerifiedBadge === true;
}

export async function fetchVlueBadgeSnapshot() {
  const res = await vlueAuthFetch("/api/lettering/showcase/badge");
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) return null;
  const badge = data.badge || {};
  writeVlueBadgeLocal({
    vlueVerifiedBadge: Boolean(badge.vlueVerifiedBadge),
    showcaseShareCount: Number(badge.showcaseShareCount) || 0
  });
  return badge;
}

export async function recordSelfShowcaseShareApi() {
  const res = await vlueAuthFetch("/api/lettering/showcase/self-share", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) return null;
  writeVlueBadgeLocal({
    vlueVerifiedBadge: Boolean(data.vlueVerifiedBadge),
    showcaseShareCount: Number(data.showcaseShareCount) || 0
  });
  return data;
}

export { CHANGED_EVENT as VLUE_VERIFIED_BADGE_CHANGED_EVENT };
