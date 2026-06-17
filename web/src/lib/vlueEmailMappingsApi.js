import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { getMemberHandle } from "./memberCardStorage.js";

const OFFLINE_MAPPING = {
  ok: true,
  mapping: {
    configured: false,
    membershipStatus: "FREE",
    loginPrefix: "",
    virtualEmailPrefix: "",
    userCompanySlug: null,
    fullVirtualEmail: null,
    targetMasterEmail: null,
    masterEmails: [],
    addressKind: "standard"
  },
  isPremium: false,
  degraded: true
};

export function readLocalLoginPrefix() {
  return String(getMemberHandle() || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

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
  emitEmailMappingChanged();
  return data;
}

export async function addMasterEmail(email) {
  const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/masters"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "메일 등록에 실패했습니다.");
    err.code = data.code;
    throw err;
  }
  emitEmailMappingChanged();
  return data;
}

export async function setPrimaryMasterEmail(email) {
  const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/masters/primary"), {
    method: "PATCH",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "대표 메일 설정에 실패했습니다.");
    err.code = data.code;
    throw err;
  }
  emitEmailMappingChanged();
  return data;
}

/** @deprecated — setPrimaryMasterEmail 사용 */
export async function saveTargetMasterEmail(targetMasterEmail) {
  return setPrimaryMasterEmail(targetMasterEmail);
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

export async function fetchEmailInbox() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/inbox"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, inbox: [] };
    return data;
  } catch {
    return { ok: false, inbox: [] };
  }
}

export async function fetchEmailInboxDetail(id) {
  const res = await vlueAuthFetch(apiUrl(`/api/email-forwarding/inbox/${encodeURIComponent(id)}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "메일을 불러오지 못했습니다.");
  return data;
}

export async function sendOutboundEmail(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/send"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "메일 발송에 실패했습니다.");
  }
  emitEmailInboxChanged();
  return data;
}

export async function connectExternalMailAccount(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/external-accounts"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "외부 메일 연동에 실패했습니다.");
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function fetchExternalMailAccounts() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/email-forwarding/external-accounts"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, accounts: [] };
    return data;
  } catch {
    return { ok: false, accounts: [] };
  }
}

export function emitEmailMappingChanged() {
  try {
    window.dispatchEvent(new CustomEvent("vlue-email-mapping-changed"));
  } catch {
    /* ignore */
  }
}

export function emitEmailInboxChanged() {
  try {
    window.dispatchEvent(new CustomEvent("vlue-email-inbox-changed"));
  } catch {
    /* ignore */
  }
}

export function slugifyCompanyName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
}
