import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const OFFLINE_MAPPING = {
  ok: true,
  mapping: {
    configured: false,
    membershipStatus: "FREE",
    virtualEmailPrefix: "",
    userCompanySlug: null,
    fullVirtualEmail: null,
    targetMasterEmail: null,
    addressKind: "standard"
  },
  isPremium: false,
  degraded: true
};

export async function fetchEmailForwardingMapping() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/mapping"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[email-forwarding] mapping http", res.status, data);
      return { ...OFFLINE_MAPPING, ...data };
    }
    return data;
  } catch (e) {
    console.warn("[email-forwarding] mapping fetch failed", e);
    return { ...OFFLINE_MAPPING };
  }
}

export async function saveVirtualEmailMapping(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/mapping"), {
    method: "PUT",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "가상 메일 설정에 실패했습니다.");
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function saveTargetMasterEmail(targetMasterEmail) {
  const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/target"), {
    method: "PATCH",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ targetMasterEmail })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "마스터 메일 저장에 실패했습니다.");
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function fetchEmailForwardingNotifications() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/notifications"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, notifications: [] };
    return data;
  } catch {
    return { ok: false, notifications: [] };
  }
}

export function slugifyCompanyName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
}
