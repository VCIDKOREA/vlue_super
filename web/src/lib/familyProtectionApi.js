import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `요청 실패 (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    err.needsExtension =
      data.code === "FAMILY_SLOT_LIMIT" || data.code === "FAMILY_SLOT_NEEDS_EXTENSION";
    throw err;
  }
  return data;
}

export async function fetchFamilyProtection() {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/links"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function updateFamilyProtectionSettings(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/settings"), {
    method: "PATCH",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function createFamilyProtectionLink(wardHandle, familyRelation, guardianImpUid) {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/links"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ wardHandle, familyRelation, guardianImpUid })
  });
  return parseJson(res);
}

/** 별칭: POST /api/family/invite */
export async function inviteFamilyMember(wardHandle, familyRelation, guardianImpUid) {
  const res = await vlueAuthFetch(apiUrl("/api/family/invite"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ wardHandle, familyRelation, guardianImpUid })
  });
  return parseJson(res);
}

export async function acceptFamilyProtectionLink(linkId) {
  const res = await vlueAuthFetch(apiUrl(`/api/family-protection/links/${linkId}/accept`), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function rejectFamilyProtectionLink(linkId) {
  const res = await vlueAuthFetch(apiUrl(`/api/family-protection/links/${linkId}/reject`), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function fetchFamilyCircle() {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/circle"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function revokeFamilyProtectionLink(linkId) {
  const res = await vlueAuthFetch(apiUrl(`/api/family-protection/links/${linkId}/revoke`), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function postFamilyHeartbeat() {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/presence/heartbeat"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({})
  });
  return parseJson(res);
}

export async function postMissedCall() {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/presence/missed-call"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({})
  });
  return parseJson(res);
}

export async function reportRiskySiteAccess(url, referrer) {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/ward/risky-site"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ url, referrer: referrer || "" })
  });
  return parseJson(res);
}

export async function postWardCallEvent(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/ward/call-event"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

/** 네이티브 셸 통화 알림 (alias — governmentHotlines 자동 분류) */
export async function postFamilyAlertCall(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/alert/call"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function postWardRemoteApp(packageOrLabel) {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/ward/remote-app"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ packageId: packageOrLabel, appLabel: packageOrLabel })
  });
  return parseJson(res);
}

export async function requestBankConsent(linkId, payload) {
  const res = await vlueAuthFetch(apiUrl(`/api/family-protection/links/${linkId}/bank-consent/request`), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function respondBankConsent(linkId, accept) {
  const res = await vlueAuthFetch(apiUrl(`/api/family-protection/links/${linkId}/bank-consent/respond`), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ accept })
  });
  return parseJson(res);
}

export async function postChildBankTransaction(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/ward/bank-transaction"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}
