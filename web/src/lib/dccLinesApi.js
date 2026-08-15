import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const BASE = "/api/cards/dcc-lines";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "번호 DCC 요청에 실패했습니다.");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function fetchDccLines() {
  const res = await vlueAuthFetch(apiUrl(BASE), { headers: vlueAuthHeaders() });
  return parseJson(res);
}

export async function fetchDccLineBundle(cardId) {
  const res = await vlueAuthFetch(apiUrl(`${BASE}/${encodeURIComponent(cardId)}`), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function assignDccLineAgent(cardId, agentId) {
  const res = await vlueAuthFetch(apiUrl(`${BASE}/${encodeURIComponent(cardId)}/agent`), {
    method: "PUT",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ agentId })
  });
  return parseJson(res);
}

export async function putDccLineDcc(cardId, body) {
  const res = await vlueAuthFetch(apiUrl(`${BASE}/${encodeURIComponent(cardId)}/dcc`), {
    method: "PUT",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(body || {})
  });
  return parseJson(res);
}

export async function fetchDccLineShowcase(cardId) {
  const res = await vlueAuthFetch(apiUrl(`${BASE}/${encodeURIComponent(cardId)}/showcase`), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function putDccLineShowcase(cardId, body) {
  const res = await vlueAuthFetch(apiUrl(`${BASE}/${encodeURIComponent(cardId)}/showcase`), {
    method: "PUT",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(body || {})
  });
  return parseJson(res);
}
