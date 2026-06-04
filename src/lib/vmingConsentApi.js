import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

export const VMING_CONSENT_LEGAL =
  "본 동의는 VLUE 개인정보처리방침에 따라 처리됩니다. 수집된 대화 내용은 AI 분석 후 즉시 파기되며 외부 서버에 저장되지 않습니다. 동의는 언제든지 철회 가능합니다.";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchVmingConsentStatus(roomId) {
  const res = await vlueAuthFetch(apiUrl(`/api/vming/consent/status?roomId=${encodeURIComponent(roomId)}`), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function requestVmingConsent({ roomId, consentMode, validityDays, sessionOnly, requesterName, members }) {
  const res = await vlueAuthFetch(apiUrl("/api/vming/consent/request"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, consentMode, validityDays, sessionOnly, requesterName, members })
  });
  return parseJson(res);
}

export async function respondVmingConsent({ roomId, status }) {
  const res = await vlueAuthFetch(apiUrl("/api/vming/consent/respond"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId,
      status,
      deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : ""
    })
  });
  return parseJson(res);
}

export async function withdrawVmingConsent(roomId) {
  const res = await vlueAuthFetch(apiUrl("/api/vming/consent/withdraw"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ roomId })
  });
  return parseJson(res);
}

export async function evictVmingFromRoom(roomId) {
  const res = await vlueAuthFetch(apiUrl("/api/vming/consent/evict"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ roomId })
  });
  return parseJson(res);
}
