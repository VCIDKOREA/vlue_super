import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

export async function fetchLineBillingStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/billing/lines/status"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "회선 결제 상태를 불러오지 못했습니다.");
  return data;
}

export async function chargeLineSubscription(lineId) {
  const res = await vlueAuthFetch(apiUrl(`/api/billing/lines/${encodeURIComponent(lineId)}/charge`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "결제에 실패했습니다.");
  return data;
}

export async function cancelLineSubscription(lineId, reason = "user_cancel") {
  const res = await vlueAuthFetch(apiUrl(`/api/billing/lines/${encodeURIComponent(lineId)}/cancel`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "해지에 실패했습니다.");
  return data;
}

export async function prepareLineBillingCart(businessCardIds, amountKrw = 9900) {
  const res = await vlueAuthFetch(apiUrl("/api/billing/lines/cart/prepare"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessCardIds, amountKrw })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "회선 신청에 실패했습니다.");
  return data;
}
