import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

export async function fetchFamilyCrossSecurityDashboard() {
  const res = await vlueAuthFetch(apiUrl("/api/family-cross-security/dashboard"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function reportFamilyCrossThreat(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/family-cross-security/threats"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function fetchFamilySecurityState() {
  const res = await vlueAuthFetch(apiUrl("/api/family-cross-security/state"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function syncFamilySecurityState(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/family-cross-security/state"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function resolveFamilyCrossThreat(incidentId, packageRemoved = true) {
  const res = await vlueAuthFetch(apiUrl(`/api/family-cross-security/threats/${incidentId}/resolve`), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ packageRemoved })
  });
  return parseJson(res);
}
