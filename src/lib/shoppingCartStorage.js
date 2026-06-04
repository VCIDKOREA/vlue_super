/** VLUE 스토어 장바구니 — UI 캐시만 로컬, 상품·가격은 서버 동기화 후 담기 */

import { ensureStoreProductSynced, getServerUserId } from "./shopApi.js";
import { getStoreProduct } from "./vlueStoreStorage.js";

const KEY = "vlue_shopping_cart_v1";

export const SHOPPING_CART_CHANGED = "vlue-shopping-cart-changed";

export const CART_SHIPPING_FEE_KRW = 3000;

/** 판매자 업로드 대표 이미지 URL (data URL 포함) */
export function resolveCartItemImage(item) {
  if (!item) return "";
  const direct = String(item.imageUrl || item.imageDataUrl || item.thumbUrl || "").trim();
  if (direct) return direct;
  const productId = String(item.productId || "").trim();
  if (productId) {
    const p = getStoreProduct(productId);
    if (p?.imageDataUrl) return p.imageDataUrl;
    if (p?.imageUrl) return p.imageUrl;
  }
  return "";
}

function normalizeItem(raw) {
  const merged = { ...(raw || {}) };
  const productId = String(merged.productId || "").trim();
  const product = productId ? getStoreProduct(productId) : null;

  if (product) {
    merged.name = merged.name || product.name;
    if (merged.price == null || merged.price === 0) {
      merged.price = product.salePriceKrw != null ? product.salePriceKrw : product.priceKrw;
    }
    if (merged.shippingFeeKrw == null && product.shippingFeeKrw != null) {
      merged.shippingFeeKrw = product.shippingFeeKrw;
    }
    merged.imageUrl = merged.imageUrl || product.imageDataUrl || product.imageUrl || "";
  }

  const imageUrl = resolveCartItemImage(merged);
  const sellerUserId = String(merged.sellerUserId || getServerUserId() || "").trim();

  return {
    id: String(merged.id || `cart-${Date.now()}`),
    productId: productId || null,
    serverProductId: merged.serverProductId || null,
    sellerUserId,
    name: String(merged.name || "상품"),
    price: Number(merged.price) || 0,
    qty: Math.max(1, Number(merged.qty) || 1),
    checked: merged.checked !== false,
    imageUrl,
    shippingFeeKrw: merged.shippingFeeKrw,
    sellerName: merged.sellerName || product?.sellerName || "VLUE 스토어"
  };
}

function readItems() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem);
  } catch {
    return [];
  }
}

function writeItems(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.map(normalizeItem).slice(0, 80)));
    window.dispatchEvent(new Event(SHOPPING_CART_CHANGED));
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("vlue-store-changed", () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return;
      writeItems(parsed);
    } catch {
      /* ignore */
    }
  });
}

export function readCartItems() {
  return readItems();
}

export function readSelectedCartItems() {
  return readItems().filter((it) => it.checked);
}

export function lineTotal(item) {
  return (Number(item.price) || 0) * (Number(item.qty) || 1);
}

export function cartSelectedSubtotal(items = readItems()) {
  return items.filter((it) => it.checked).reduce((sum, it) => sum + lineTotal(it), 0);
}

export function cartShippingFee(items = readSelectedCartItems()) {
  if (!items.length) return 0;
  const needsShipping = items.some((it) => {
    const fee = it.shippingFeeKrw ?? CART_SHIPPING_FEE_KRW;
    return Number(fee) > 0;
  });
  if (!needsShipping) return 0;
  return items.reduce((max, it) => Math.max(max, Number(it.shippingFeeKrw ?? CART_SHIPPING_FEE_KRW) || 0), 0);
}

export function cartSelectedTotal(items = readItems()) {
  const selected = items.filter((it) => it.checked);
  return cartSelectedSubtotal(selected) + cartShippingFee(selected);
}

export function toggleCartChecked(id) {
  const items = readItems().map((it) => (it.id === id ? { ...it, checked: !it.checked } : it));
  writeItems(items);
  return items;
}

export function setCartChecked(id, checked) {
  const items = readItems().map((it) => (it.id === id ? { ...it, checked: Boolean(checked) } : it));
  writeItems(items);
  return items;
}

export function setAllCartChecked(checked) {
  const items = readItems().map((it) => ({ ...it, checked: Boolean(checked) }));
  writeItems(items);
  return items;
}

/** 판매자 등록 상품 → 서버 동기화 후 장바구니 담기 */
export async function addProductToCart(product, { qty = 1, sellerName, checked = true, sellerUserId } = {}) {
  if (!product?.id) return null;
  const sync = await ensureStoreProductSynced(product);
  const price = product.salePriceKrw != null ? product.salePriceKrw : product.priceKrw;
  const imageUrl = product.imageDataUrl || product.imageUrl || "";
  const sellerId = String(sellerUserId || product.sellerUserId || getServerUserId() || "").trim();
  const items = readItems();
  const existingIdx = items.findIndex((it) => it.productId === product.id);
  if (existingIdx >= 0) {
    const prev = items[existingIdx];
    items[existingIdx] = normalizeItem({
      ...prev,
      serverProductId: sync.productId,
      sellerUserId: sellerId,
      qty: (prev.qty || 1) + (Number(qty) || 1),
      checked: true,
      imageUrl: imageUrl || prev.imageUrl,
      price: Number(price) || prev.price
    });
    writeItems(items);
    return items[existingIdx].id;
  }
  const id = `cart-${product.id}`;
  writeItems([
    normalizeItem({
      id,
      productId: product.id,
      serverProductId: sync.productId,
      sellerUserId: sellerId,
      name: product.name,
      price: Number(price) || 0,
      qty: Number(qty) || 1,
      checked,
      imageUrl,
      shippingFeeKrw: product.shippingFeeKrw,
      sellerName: sellerName || product.sellerName || "VLUE 입점"
    }),
    ...items
  ]);
  return id;
}

export async function addToCart({
  productId,
  name,
  price,
  qty = 1,
  imageUrl,
  imageDataUrl,
  sellerName,
  shippingFeeKrw,
  sellerUserId
}) {
  if (productId) {
    const p = getStoreProduct(productId);
    if (p) return addProductToCart(p, { qty, sellerName, sellerUserId });
  }
  throw new Error("등록된 상품만 장바구니에 담을 수 있습니다.");
}

export function countCartItems() {
  return readItems().length;
}

export function removeCartItemsByIds(ids = []) {
  const drop = new Set(ids);
  const next = readItems().filter((it) => !drop.has(it.id));
  writeItems(next);
  return next;
}
