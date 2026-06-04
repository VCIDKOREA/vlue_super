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

export async function fetchWalletSummary() {
  const res = await vlueAuthFetch(apiUrl("/api/wallet/me"), { headers: vlueAuthHeaders() });
  return parseJson(res);
}

export async function requestWalletDeposit(amountKrw, note) {
  const res = await vlueAuthFetch(apiUrl("/api/wallet/deposit-request"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ amountKrw: Number(amountKrw) || 0, note: note || "" })
  });
  return parseJson(res);
}

export async function fetchWithdrawalAccount() {
  const res = await vlueAuthFetch(apiUrl("/api/wallet/withdrawal-account"), { headers: vlueAuthHeaders() });
  return parseJson(res);
}

export async function saveWithdrawalAccount(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/wallet/withdrawal-account"), {
    method: "PUT",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}

export async function requestWalletWithdrawal(amountKrw) {
  const res = await vlueAuthFetch(apiUrl("/api/wallet/withdrawal-request"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ amountKrw: Number(amountKrw) || 0 })
  });
  return parseJson(res);
}
