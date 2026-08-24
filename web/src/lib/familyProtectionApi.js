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
  const data = await parseJson(res);
  try {
    sessionStorage.setItem("vlue_family_protection_cache_v1", JSON.stringify(data));
  } catch {
    /* ignore */
  }
  return data;
}

export function peekFamilyProtectionCache() {
  try {
    const raw = sessionStorage.getItem("vlue_family_protection_cache_v1");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function updateFamilyProtectionSettings(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/family-protection/settings"), {
    method: "PATCH",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function lookupFamilyInviteCandidates(query) {
  const q = String(query || "").trim();
  if (!q) {
    const err = new Error("가족 VLUE 아이디 또는 전화번호를 입력해 주세요.");
    err.status = 400;
    throw err;
  }
  const res = await vlueAuthFetch(
    apiUrl(`/api/family-protection/lookup?q=${encodeURIComponent(q)}`),
    { headers: vlueAuthHeaders() }
  );
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
