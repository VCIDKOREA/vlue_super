import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `요청 실패 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** 통화 종료 → 카카오 알림톡 트리거 (미가입자·필터링은 API) */
export async function postCallEndAlimtalk({ peerPhone, durationSec, direction } = {}) {
  const res = await vlueAuthFetch(apiUrl("/api/notifications/alimtalk/call-ended"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({
      peerPhone: String(peerPhone || "").trim(),
      durationSec: durationSec != null ? Number(durationSec) : undefined,
      direction: direction === "out" ? "out" : "in"
    })
  });
  return parseJson(res);
}
