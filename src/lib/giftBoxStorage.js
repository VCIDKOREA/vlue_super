const STORAGE_KEY = "vlue_gift_box_v1";

/** @typedef {'available' | 'used' | 'expired'} GiftStatus */
/** @typedef {'coupon' | 'product' | 'voucher'} GiftKind */

/**
 * @typedef {Object} GiftItem
 * @property {string} id
 * @property {string} title
 * @property {string} fromLabel
 * @property {string} [storeName]
 * @property {GiftKind} kind
 * @property {GiftStatus} status
 * @property {string} receivedAt
 * @property {string} expiresAt
 * @property {string} [valueLabel]
 * @property {string} [note]
 */

export const DEFAULT_GIFT_ITEMS = [
  {
    id: "g-1",
    title: "Soul Cafe 음료 1잔 무료",
    fromLabel: "Soul Cafe",
    storeName: "Soul Cafe",
    kind: "coupon",
    status: "available",
    receivedAt: "2026-05-16T14:00:00",
    expiresAt: "2026-06-30T23:59:59",
    valueLabel: "쿠폰",
    note: "라이브 시청 감사 이벤트"
  },
  {
    id: "g-2",
    title: "쿠쿠 라이브 공동구매 5% 할인",
    fromLabel: "쿠쿠 CUKOO",
    storeName: "쿠쿠 CUKOO",
    kind: "coupon",
    status: "available",
    receivedAt: "2026-05-15T11:00:00",
    expiresAt: "2026-05-25T23:59:59",
    valueLabel: "할인",
    note: "5월 7일 라이브 참여 보상"
  },
  {
    id: "g-3",
    title: "VLUE 체험단 포인트 3,000P",
    fromLabel: "VLUE",
    kind: "voucher",
    status: "used",
    receivedAt: "2026-05-01T09:00:00",
    expiresAt: "2026-05-31T23:59:59",
    valueLabel: "포인트",
    note: "리뷰 제출 완료 후 지급"
  },
  {
    id: "g-4",
    title: "동네 꽃집 미니 부케 교환권",
    fromLabel: "플라워하우스",
    storeName: "플라워하우스",
    kind: "product",
    status: "expired",
    receivedAt: "2026-04-10T12:00:00",
    expiresAt: "2026-05-10T23:59:59",
    valueLabel: "교환권"
  }
];

/** @returns {GiftItem[]} */
export function readGiftBox() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_GIFT_ITEMS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_GIFT_ITEMS];
  } catch {
    return [...DEFAULT_GIFT_ITEMS];
  }
}

/** @param {GiftItem[]} items */
export function writeGiftBox(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("vlue-gift-box-changed"));
  } catch {
    /* ignore */
  }
}

/** @param {GiftItem[]} items */
export function countAvailableGifts(items) {
  return items.filter((g) => g.status === "available").length;
}

/** @param {GiftItem[]} items */
export function countExpiringSoon(items, withinDays = 7) {
  const now = Date.now();
  const limit = now + withinDays * 24 * 60 * 60 * 1000;
  return items.filter((g) => {
    if (g.status !== "available") return false;
    const exp = new Date(g.expiresAt).getTime();
    return Number.isFinite(exp) && exp >= now && exp <= limit;
  }).length;
}
