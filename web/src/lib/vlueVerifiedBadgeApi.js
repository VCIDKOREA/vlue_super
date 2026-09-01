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

export function shouldShowVlueVerifiedSeal(ctx = {}) {
  if (ctx.vlueVerifiedBadge === true) return true;
  if (ctx.vlueVerifiedBadge === false) return false;
  const local = readVlueVerifiedBadgeLocal();
  if (local === true) return true;
  if (local === false) return false;
  return Boolean(ctx.digitalCardIssued || ctx.hasDigitalCard);
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
