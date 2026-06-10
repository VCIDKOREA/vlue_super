import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchVluerPromoApplyStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/promo/apply/status"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

/** @param {{ links?: string[], snsInstagram?: string, snsYoutube?: string, snsTiktok?: string, note?: string }} payload */
export async function postVluerPromoApply(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/promo/apply"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}
