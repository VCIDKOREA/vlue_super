import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

/**
 * 포트원 빌링키 발급(프론트) 후 첫 회차 결제·구독 활성화
 */
export async function postSubscribeComplete(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/payment/subscribe/complete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `구독 결제 처리 실패 (${res.status})`);
  }
  return data;
}
