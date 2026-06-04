import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function fetchVluerDashboard() {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/dashboard"), { headers: vlueAuthHeaders() });
  return parseJson(res);
}

export async function fetchVluerOrgMap() {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/dashboard/org-map"), { headers: vlueAuthHeaders() });
  return parseJson(res);
}

export async function fetchVluerSettlements(limit = 30) {
  const res = await vlueAuthFetch(apiUrl(`/api/vluer/dashboard/settlements?limit=${limit}`), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function simulateVluerRevenue(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/dashboard/simulate"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function requestVluerCodeChange(referralCode) {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/code-change/request"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ referralCode: String(referralCode || "").trim() })
  });
  return parseJson(res);
}
