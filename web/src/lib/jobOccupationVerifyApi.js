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

export async function fetchJobOccupationStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/cards/job-occupation/status"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function submitJobOccupationReview(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/cards/job-occupation/submit"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function fetchMultiDccEntitlement() {
  const res = await vlueAuthFetch(apiUrl("/api/cards/multi-dcc/entitlement"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function completeMultiDccCheckout(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/cards/multi-dcc/checkout"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function fetchDccModerationStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/cards/moderation/status"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function submitDccModerationAppeal(note) {
  const res = await vlueAuthFetch(apiUrl("/api/cards/moderation/appeal"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ note })
  });
  return parseJson(res);
}
