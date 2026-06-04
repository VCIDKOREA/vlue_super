import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

/** VLUER 업그레이드 가능 여부 (추천 인원 수치는 서버에서 제외) */
export async function fetchVluerUpgradeStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/upgrade/status"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

/** VLUER 등급 업그레이드 */
export async function postVluerUpgrade(targetGrade, confirmPriceChange = true) {
  const res = await vlueAuthFetch(apiUrl("/api/vluer/upgrade"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ targetGrade, confirmPriceChange })
  });
  return parseJson(res);
}
