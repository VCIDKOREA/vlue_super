import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

export const DCC_AGENT_PROFILES_PATH = "/api/cards/dcc-agent-profiles";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "담당자 프로필 요청에 실패했습니다.");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function fetchDccAgentProfiles() {
  const res = await vlueAuthFetch(apiUrl(DCC_AGENT_PROFILES_PATH), {
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

export async function activateDccAgentProfile(id) {
  const res = await vlueAuthFetch(
    apiUrl(`${DCC_AGENT_PROFILES_PATH}/${encodeURIComponent(id)}/activate`),
    {
      method: "PUT",
      headers: vlueAuthHeaders()
    }
  );
  return parseJson(res);
}
