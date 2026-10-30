import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import {
  isValidMemberHandleSlug,
  normalizeMemberHandleSlug
} from "./memberHandleRules.js";

/** 소셜 자동발급 임시 핸들 — 사용자 선택 @아이디로 교체 필요 */
export function isProvisionalAutoPublicHandle(handle) {
  const s = normalizeMemberHandleSlug(handle);
  return /^vlue[a-f0-9]{6}$/.test(s);
}

export function needsPublicHandleClaim(handle) {
  const s = normalizeMemberHandleSlug(handle);
  if (!s) return true;
  return isProvisionalAutoPublicHandle(s);
}

export function readLocalPublicHandle() {
  try {
    return normalizeMemberHandleSlug(localStorage.getItem("vlue_member_handle") || "");
  } catch {
    return "";
  }
}

export function persistLocalPublicHandle(handle) {
  const slug = normalizeMemberHandleSlug(handle);
  if (!slug) return;
  try {
    localStorage.setItem("vlue_member_handle", `@${slug}`);
    window.dispatchEvent(new CustomEvent("vlue-member-handle-changed", { detail: { handle: slug } }));
  } catch {
    /* ignore */
  }
}

export async function fetchPublicHandleStatus() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/v1/auth/profile/public-handle"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        needsClaim: needsPublicHandleClaim(readLocalPublicHandle()),
        publicHandle: readLocalPublicHandle() || null,
        error: data.error || "status_failed"
      };
    }
    const handle = normalizeMemberHandleSlug(data.publicHandle || "");
    if (handle) persistLocalPublicHandle(handle);
    return {
      ok: true,
      needsClaim: Boolean(data.needsClaim),
      publicHandle: handle || null
    };
  } catch (e) {
    return {
      ok: false,
      needsClaim: needsPublicHandleClaim(readLocalPublicHandle()),
      publicHandle: readLocalPublicHandle() || null,
      error: e?.message || "network"
    };
  }
}

export async function checkPublicHandleAvailable(raw) {
  const slug = normalizeMemberHandleSlug(raw);
  if (!isValidMemberHandleSlug(slug)) {
    return {
      available: false,
      normalized: null,
      reason: "영문 소문자로 시작, 3~20자(소문자·숫자·_), 숫자 1자 이상 포함이어야 합니다."
    };
  }
  try {
    const res = await vlueAuthFetch(
      apiUrl(`/api/auth/check-login-id?loginId=${encodeURIComponent(slug)}`)
    );
    const data = await res.json().catch(() => ({}));
    return {
      available: Boolean(data.available),
      normalized: data.normalized || slug,
      reason: data.reason || null
    };
  } catch (e) {
    return { available: false, normalized: slug, reason: e?.message || "network" };
  }
}

export async function claimPublicHandle(raw) {
  const slug = normalizeMemberHandleSlug(raw);
  if (!isValidMemberHandleSlug(slug)) {
    return {
      ok: false,
      error: "영문 소문자로 시작, 3~20자(소문자·숫자·_), 숫자 1자 이상 포함이어야 합니다."
    };
  }
  try {
    const res = await vlueAuthFetch(apiUrl("/api/v1/auth/profile/public-handle"), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ publicHandle: slug })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "claim_failed" };
    }
    const handle = normalizeMemberHandleSlug(data.publicHandle || slug);
    persistLocalPublicHandle(handle);
    return { ok: true, publicHandle: handle };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}
