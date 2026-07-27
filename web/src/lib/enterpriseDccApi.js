import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchMyEnterpriseDccApplication() {
  const res = await vlueAuthFetch(apiUrl("/api/cards/enterprise-dcc/mine"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function fetchEnterpriseRelatedParties(bno) {
  const qs = new URLSearchParams({ bno: String(bno || "") });
  const res = await vlueAuthFetch(apiUrl(`/api/cards/enterprise-dcc/related-parties?${qs}`), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function verifyEnterpriseDccBusiness(body) {
  const res = await vlueAuthFetch(apiUrl("/api/cards/enterprise-dcc/verify-business"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify(body)
  });
  return parseJson(res);
}

export async function sendEnterpriseDccOtp(applicationId, relatedPartyUserId) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/send-otp`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
      body: JSON.stringify({ relatedPartyUserId })
    }
  );
  return parseJson(res);
}

export async function verifyEnterpriseDccOtp(applicationId, otp) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/verify-otp`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
      body: JSON.stringify({ otp })
    }
  );
  return parseJson(res);
}

export async function saveEnterpriseDccDetails(applicationId, body) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/details`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
      body: JSON.stringify(body)
    }
  );
  return parseJson(res);
}

export async function submitEnterpriseDccApplication(applicationId) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/submit`),
    {
      method: "POST",
      headers: vlueAuthHeaders()
    }
  );
  return parseJson(res);
}

export async function markEnterpriseDccPaid(applicationId) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/mark-paid`),
    {
      method: "POST",
      headers: vlueAuthHeaders()
    }
  );
  return parseJson(res);
}
