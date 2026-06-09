import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchBroadcastLineMe() {
  const res = await vlueAuthFetch(apiUrl("/api/broadcast-line/me"), { headers: vlueAuthHeaders() });
  return parseJson(res);
}

export async function fetchBroadcastRefundPolicy() {
  const res = await fetch(apiUrl("/api/broadcast-line/refund-policy"));
  return parseJson(res);
}

export async function prepareBroadcastCheckout({ phoneE164, billingCycle = "monthly" }) {
  const res = await vlueAuthFetch(apiUrl("/api/broadcast-line/checkout/prepare"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ phoneE164, billingCycle })
  });
  return parseJson(res);
}

export async function completeBroadcastCheckout(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/broadcast-line/checkout/complete"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function patchBroadcastPhone(phoneE164) {
  const res = await vlueAuthFetch(apiUrl("/api/broadcast-line/me"), {
    method: "PATCH",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ phoneE164 })
  });
  return parseJson(res);
}

export async function toggleBroadcastEnabled(enabled) {
  const res = await vlueAuthFetch(apiUrl("/api/broadcast-line/toggle"), {
    method: "PATCH",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ enabled })
  });
  return parseJson(res);
}

export async function pauseBroadcastLine({ agreeRefundPolicy }) {
  const res = await vlueAuthFetch(apiUrl("/api/broadcast-line/pause"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ agreeRefundPolicy })
  });
  return parseJson(res);
}

export async function deleteBroadcastLine() {
  const res = await vlueAuthFetch(apiUrl("/api/broadcast-line/me"), {
    method: "DELETE",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}
