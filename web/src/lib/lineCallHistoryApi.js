import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "요청에 실패했습니다.");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/** 상대가 내 회선(02·1577 포함)을 오버레이 조회하면 내 계정 통화목록에 쌓임 */
export async function reportLineCallEvent(number, direction = "in") {
  const n = String(number || "").trim();
  if (!n) return { ok: true, recorded: false };
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/line-call-events"), {
      method: "POST",
      headers: vlueAuthHeaders(),
      body: JSON.stringify({ number: n, direction })
    });
    return parseJson(res);
  } catch {
    return { ok: false, recorded: false };
  }
}

export async function fetchLineCallHistory(lineId = "all") {
  const q = lineId && lineId !== "all" ? `?lineId=${encodeURIComponent(lineId)}` : "";
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/cards/dcc-lines/call-history${q}`), {
      headers: vlueAuthHeaders()
    });
    const data = await parseJson(res);
    return Array.isArray(data.events) ? data.events : [];
  } catch {
    return [];
  }
}

export async function fetchMemberNamesByNumbers(numbers) {
  const list = [...new Set((Array.isArray(numbers) ? numbers : []).map((n) => String(n || "").trim()).filter(Boolean))];
  if (!list.length) return [];
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/member-names"), {
      method: "POST",
      headers: vlueAuthHeaders(),
      body: JSON.stringify({ numbers: list.slice(0, 80) })
    });
    const data = await parseJson(res);
    return Array.isArray(data.members) ? data.members : [];
  } catch {
    return [];
  }
}
