import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || "요청에 실패했습니다.");
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export async function fetchWithdrawalStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/auth/account/withdraw/status"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function sendWithdrawalEmailCode() {
  const res = await vlueAuthFetch(apiUrl("/api/auth/account/withdraw/send-email"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({})
  });
  return parseJson(res);
}

export async function verifyWithdrawalEmail(code) {
  const res = await vlueAuthFetch(apiUrl("/api/auth/account/withdraw/verify-email"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({ code: String(code || "").trim() })
  });
  return parseJson(res);
}

export async function verifyWithdrawalPhone(impUid) {
  const res = await vlueAuthFetch(apiUrl("/api/auth/account/withdraw/verify-phone"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({ impUid: String(impUid || "").trim() })
  });
  return parseJson(res);
}

export async function applyManualWithdrawal(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/auth/account/withdraw/apply-manual"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function cancelScheduledWithdrawal() {
  const res = await vlueAuthFetch(apiUrl("/api/auth/account/withdraw/cancel"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({})
  });
  return parseJson(res);
}
