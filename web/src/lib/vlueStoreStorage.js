/**
 * VLUE PAGE 상점 신청·상품 (로컬 프로토타입 — 추후 API 연동)
 */

import { PAGE_PROFILE_CHANGED_EVENT } from "./pageProfileStorage.js";

export const STORE_APPLICATION_KEY = "vlue_store_application_v1";
export const STORE_PRODUCTS_KEY = "vlue_store_products_v1";

export const PRODUCT_CATEGORIES = [
  "식품·음료",
  "뷰티·헬스",
  "패션·잡화",
  "디지털·콘텐츠",
  "생활·인테리어",
  "서비스·예약",
  "기타"
];

export const STORE_APPLICATION_STATUS = {
  NONE: "none",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
};

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : fallback;
  } catch {
    return fallback;
  }
}

function notifyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PAGE_PROFILE_CHANGED_EVENT));
    window.dispatchEvent(new Event("vlue-store-changed"));
  }
}

export function readStoreApplication() {
  return safeParse(localStorage.getItem(STORE_APPLICATION_KEY), {
    status: STORE_APPLICATION_STATUS.NONE
  });
}

export function saveStoreApplication(patch) {
  const prev = readStoreApplication();
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORE_APPLICATION_KEY, JSON.stringify(next));
  notifyChanged();
  return next;
}

export function isStoreApproved() {
  return readStoreApplication().status === STORE_APPLICATION_STATUS.APPROVED;
}

export function readStoreProducts() {
  const list = safeParse(localStorage.getItem(STORE_PRODUCTS_KEY), []);
  return Array.isArray(list) ? list : [];
}

export function saveStoreProducts(list) {
  localStorage.setItem(STORE_PRODUCTS_KEY, JSON.stringify(list.slice(0, 200)));
  notifyChanged();
}

export function upsertStoreProduct(product) {
  const list = readStoreProducts();
  const idx = list.findIndex((p) => p.id === product.id);
  if (idx >= 0) list[idx] = product;
  else list.unshift(product);
  saveStoreProducts(list);
  return product;
}

export function deleteStoreProduct(productId) {
  const next = readStoreProducts().filter((p) => p.id !== productId);
  saveStoreProducts(next);
  return next;
}

export function getStoreProduct(productId) {
  return readStoreProducts().find((p) => p.id === productId) || null;
}

/** 파일 → data URL (신청 서류, 최대 800KB) */
export function readFileAsDataUrlLimited(file, maxBytes = 800 * 1024) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("파일이 없습니다."));
    if (file.size > maxBytes) {
      return reject(new Error(`파일은 ${Math.round(maxBytes / 1024)}KB 이하여야 합니다.`));
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("파일을 읽지 못했습니다."));
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

export function formatKrwDisplay(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return `${v.toLocaleString("ko-KR")}원`;
}
