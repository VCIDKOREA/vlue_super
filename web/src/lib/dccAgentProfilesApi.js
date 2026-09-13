import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

export const DCC_AGENT_PROFILES_PATH = "/api/cards/dcc-agent-profiles";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback =
      res.status >= 500
        ? "서버 오류로 담당자 프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "담당자 프로필 요청에 실패했습니다.";
    const err = new Error(data.error || fallback);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function fetchDccAgentProfiles(cardId) {
  const q = cardId ? `?cardId=${encodeURIComponent(cardId)}` : "";
  const res = await vlueAuthFetch(apiUrl(`${DCC_AGENT_PROFILES_PATH}${q}`), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function createDccAgentProfile(body) {
  const res = await vlueAuthFetch(apiUrl(DCC_AGENT_PROFILES_PATH), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(body || {})
  });
  return parseJson(res);
}

export async function updateDccAgentProfile(id, body) {
  const res = await vlueAuthFetch(apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(body || {})
  });
  return parseJson(res);
}

export async function deleteDccAgentProfile(id) {
  const res = await vlueAuthFetch(apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function activateDccAgentProfile(id, cardId) {
  const res = await vlueAuthFetch(
    apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}/activate`),
    {
      method: "PUT",
      headers: vlueAuthHeaders(),
      body: JSON.stringify({ cardId: cardId || undefined })
    }
  );
  return parseJson(res);
}

export async function setRepresentativeDccProfile(id) {
  const res = await vlueAuthFetch(
    apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}/representative`),
    {
      method: "PUT",
      headers: vlueAuthHeaders()
    }
  );
  return parseJson(res);
}

export async function assignLinesToDccProfile(id, lineIds) {
  const res = await vlueAuthFetch(
    apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}/lines`),
    {
      method: "PUT",
      headers: vlueAuthHeaders(),
      body: JSON.stringify({ lineIds: Array.isArray(lineIds) ? lineIds : [] })
    }
  );
  return parseJson(res);
}

export async function putDccProfileBundle(id, body) {
  const res = await vlueAuthFetch(
    apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}/bundle`),
    {
      method: "PUT",
      headers: vlueAuthHeaders(),
      body: JSON.stringify(body || {})
    }
  );
  return parseJson(res);
}

export async function fetchDccProfileBundle(id) {
  const res = await vlueAuthFetch(
    apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}/bundle`),
    {
      headers: vlueAuthHeaders()
    }
  );
  return parseJson(res);
}

export async function setDccProfileContacts(id, phones) {
  const res = await vlueAuthFetch(
    apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}/contacts`),
    {
      method: "PUT",
      headers: vlueAuthHeaders(),
      body: JSON.stringify({ phones: Array.isArray(phones) ? phones : [] })
    }
  );
  return parseJson(res);
}
