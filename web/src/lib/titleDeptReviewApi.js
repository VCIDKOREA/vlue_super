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

/** 직책·부서 확인 서류 — 최신 검토 상태 */
export async function fetchTitleDeptStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/cards/title-dept/status"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

/** 직책·부서 변경 신청 */
export async function submitTitleDeptReview(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/cards/title-dept/submit"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  return parseJson(res);
}
