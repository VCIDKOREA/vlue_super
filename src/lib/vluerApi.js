import { apiUrl } from "./apiBase.js";
import { vlueAuthHeaders, vlueAuthFetch } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function fetchVluerMe() {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/me"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function issueVluerReferralCode() {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/referral-code/issue"), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}
