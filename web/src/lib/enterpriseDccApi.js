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

/** 시나리오 A — 대표자/관계자 승인 요청 */
export async function requestEnterpriseDccOwnerApproval(applicationId, payload) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/request-owner-approval`),
    {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    }
  );
  return parseJson(res);
}

export async function fetchOwnerPendingDccApprovals() {
  const res = await vlueAuthFetch(apiUrl("/api/cards/enterprise-dcc/owner-pending"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function reviewOwnerDccApproval(applicationId, payload) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/owner-review`),
    {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    }
  );
  return parseJson(res);
}

/** 시나리오 B — 증빙 서류 메타 저장 */
export async function uploadEnterpriseDccDocuments(applicationId, { documents, workplaceAddress } = {}) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/documents`),
    {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        documents: documents || [],
        workplaceAddress: workplaceAddress || undefined
      })
    }
  );
  return parseJson(res);
}

export async function saveEnterpriseWorkplace(applicationId, payload) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/workplace`),
    {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    }
  );
  return parseJson(res);
}

/** @deprecated alias */
export const saveEnterpriseDccWorkplace = saveEnterpriseWorkplace;

export async function attestEnterpriseDccSecurity(applicationId, attestation) {
  const body =
    attestation && typeof attestation === "object"
      ? {
          lat: attestation.lat,
          lng: attestation.lng,
          networkType: attestation.networkType,
          vpnActive: Boolean(attestation.vpnActive),
          installedPackages: Array.isArray(attestation.installedPackages)
            ? attestation.installedPackages
            : []
        }
      : {};
  const res = await vlueAuthFetch(
    apiUrl(`/api/cards/enterprise-dcc/${encodeURIComponent(applicationId)}/security-attest`),
    {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
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
