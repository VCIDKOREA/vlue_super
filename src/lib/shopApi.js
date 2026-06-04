import { apiUrl } from "./apiBase.js";
import { VlueNetworkError } from "./networkError.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

async function parseShopJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `요청 실패 (${res.status})`);
  }
  return data;
}

export async function syncStoreProductToServer(product) {
  const res = await vlueAuthFetch(apiUrl("/api/shop/products/sync"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      externalId: product.id,
      name: product.name,
      priceKrw: product.priceKrw,
      salePriceKrw: product.salePriceKrw ?? null,
      shippingFeeKrw: product.shippingFeeKrw ?? 0,
      stock: product.stock ?? 0,
      status: product.status || "on_sale"
    })
  });
  return parseShopJson(res);
}

/** PostgreSQL에 동기화된 판매 상품 목록 */
export async function fetchShopProducts({ sellerUserId, status = "on_sale" } = {}) {
  const q = new URLSearchParams();
  if (sellerUserId) q.set("sellerUserId", sellerUserId);
  if (status) q.set("status", status);
  const res = await vlueAuthFetch(apiUrl(`/api/shop/products?${q}`), {
    headers: { "Content-Type": "application/json" }
  });
  const data = await parseShopJson(res);
  return data.products || [];
}

export function mapServerShopProduct(row, localProduct = null) {
  const externalId = row.externalId || row.id;
  return {
    id: externalId,
    serverProductId: row.serverProductId || row.id,
    sellerUserId: row.sellerUserId,
    name: row.name,
    priceKrw: row.priceKrw ?? row.unitPriceKrw,
    salePriceKrw: row.salePriceKrw,
    shippingFeeKrw: row.shippingFeeKrw ?? 0,
    stock: row.stock ?? 0,
    status: row.status || "on_sale",
    imageDataUrl: localProduct?.imageDataUrl || localProduct?.imageUrl || "",
    imageUrl: localProduct?.imageUrl || "",
    description: localProduct?.description || "",
    category: localProduct?.category,
    paymentEnabled: true
  };
}

export async function prepareShopOrder(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/shop/orders/prepare"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseShopJson(res);
}

export async function postShopPaymentComplete(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/shop/payment/complete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseShopJson(res);
}

export function getServerUserId() {
  try {
    return localStorage.getItem("vlue_server_user_id") || "";
  } catch {
    return "";
  }
}

/** 장바구니·결제 전 상품 서버 동기화 (실패 시 네트워크 오류) */
export async function ensureStoreProductSynced(product) {
  try {
    return await syncStoreProductToServer(product);
  } catch (e) {
    throw new VlueNetworkError(undefined, e);
  }
}
