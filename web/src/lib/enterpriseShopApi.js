import { apiUrl } from "./apiBase.js";
import { clientKindHeaders } from "./deviceAuth.js";
import { vlueAuthFetch, getAccessToken } from "./vlueAuthHeaders.js";

export async function fetchEnterpriseDashboard() {
  const res = await vlueAuthFetch(apiUrl("/api/shop/enterprise/dashboard"), {
    headers: clientKindHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "기업 정보를 불러올 수 없습니다.");
  return data;
}

export async function postPurchaseRequest(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/shop/enterprise/purchase-request"), {
    method: "POST",
    headers: { ...clientKindHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "구매 요청 실패");
  return data;
}

export async function addEnterpriseCartItem(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/shop/enterprise/cart/items"), {
    method: "POST",
    headers: { ...clientKindHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "장바구니 추가 실패");
  return data;
}

export async function shareEnterpriseCartToChat() {
  const res = await vlueAuthFetch(apiUrl("/api/shop/enterprise/cart/share-to-chat"), {
    method: "POST",
    headers: clientKindHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "그룹방 공유 실패");
  return data;
}

export async function reviewPurchaseRequest(requestId, action, note) {
  const res = await vlueAuthFetch(apiUrl(`/api/shop/enterprise/purchase-requests/${requestId}/review`), {
    method: "POST",
    headers: { ...clientKindHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action, note })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "처리 실패");
  return data;
}

export async function fetchPendingDevices() {
  const res = await vlueAuthFetch(apiUrl("/api/auth/devices/pending"), {
    headers: clientKindHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "기기 목록 실패");
  return data.devices || [];
}

export async function approveDevice(deviceId) {
  const res = await vlueAuthFetch(apiUrl(`/api/auth/devices/${deviceId}/approve`), {
    method: "POST",
    headers: clientKindHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "기기 승인 실패");
  return data;
}

export function canEnterprisePurchase(role) {
  return role === "MASTER" || role === "MANAGER" || role === "BUYER";
}

export function isEnterpriseStaff(role) {
  return role === "STAFF";
}

export async function downloadEnterpriseTaxCsv() {
  const res = await vlueAuthFetch(apiUrl("/api/shop/enterprise/tax-export.csv"), {
    headers: clientKindHeaders()
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "다운로드 실패");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "enterprise_tax_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function openEnterpriseTaxPrint() {
  const token = getAccessToken();
  const headers = { ...clientKindHeaders() };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl("/api/shop/enterprise/tax-export/print"), { headers });
  if (!res.ok) throw new Error("증빙 인쇄 페이지를 열 수 없습니다.");
  const html = await res.text();
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
