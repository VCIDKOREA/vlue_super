import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

export const COUPANG_AFFILIATE_URL = "https://link.coupang.com/a/hye1MPPUce";
export const PATCH_WINDOW_MS = 24 * 60 * 60 * 1000;
export const PATCH_WARN_MS = 30 * 60 * 1000;
const LOCAL_KEY = "vlue_safety_patch_v1";

export function formatPatchCountdown(ms) {
  const capped = Math.min(Math.max(0, ms), PATCH_WINDOW_MS - 1000);
  const total = Math.floor(capped / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function readLocalPatch() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lastPatchedAt = String(parsed?.lastPatchedAt || "");
    if (!lastPatchedAt) return null;
    return { lastPatchedAt };
  } catch {
    return null;
  }
}

export function writeLocalPatch(lastPatchedAt) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ lastPatchedAt }));
  } catch {
    /* ignore */
  }
}

export function remainingFrom(lastPatchedAt, now = Date.now()) {
  const t = new Date(lastPatchedAt || 0).getTime();
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.max(0, t + PATCH_WINDOW_MS - now);
}

async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "안심패치 요청에 실패했습니다.");
  return data;
}

export function fetchSafetyPatchStatus() {
  return vlueAuthFetch(apiUrl("/api/safety-patch/status"), { headers: vlueAuthHeaders() }).then(readJson);
}

export function completeSafetyPatch() {
  return vlueAuthFetch(apiUrl("/api/safety-patch/complete"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: "{}"
  }).then(readJson);
}

export function remindSafetyPatch() {
  return vlueAuthFetch(apiUrl("/api/safety-patch/remind"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: "{}"
  }).then(readJson);
}

export function fetchFamilySafetyReport(targetUserId, roomId = "") {
  return vlueAuthFetch(apiUrl("/api/safety-patch/report"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId, roomId })
  }).then(readJson);
}

/** 쿠팡 제휴 링크를 연 뒤 VLUÉ로 돌아온다. */
export function openCoupangAffiliateSession(url = COUPANG_AFFILIATE_URL) {
  const native = typeof window !== "undefined" ? window.Android || window.VlueLettering : null;
  if (native && typeof native.openAffiliateAndReturn === "function") {
    native.openAffiliateAndReturn(url);
    return;
  }
  if (native && typeof native.openExternalUrl === "function") {
    native.openExternalUrl(url);
    return;
  }
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => {
    try {
      popup?.blur();
    } catch {
      /* ignore */
    }
    window.focus();
  }, 900);
}

export function showLocalPatchNotice(title, body) {
  try {
    const native = window.Android || window.VlueLettering;
    native?.showSystemNotification?.(title, body, "vlue-safety-patch");
  } catch {
    /* ignore */
  }
}
