/** 가입 완료 후 유료·B2B 첫 결제 안내 */

export const PENDING_PAYMENT_STORAGE_KEY = "vlue_pending_payment_v1";

export function writePendingPayment(payload) {
  try {
    localStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readPendingPayment() {
  try {
    const raw = localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
