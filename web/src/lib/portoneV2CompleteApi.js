import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

/**
 * 포트원 V2 결제창 성공 후 서버에서 단건 조회·금액 검증·승인 처리
 * @param {{ paymentId: string, expectedAmount?: number, orderName?: string, customData?: object|null }} payload
 */
export async function postPortoneV2Complete(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/payment/v2/complete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentId: payload.paymentId,
      expectedAmount: payload.expectedAmount,
      orderName: payload.orderName,
      customData: payload.customData ?? null
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `V2 결제 승인 실패 (${res.status})`);
  }
  return data;
}
