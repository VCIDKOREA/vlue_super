/** 유료·기업 전용 쇼핑 카트 허브 — 로컬 저장 */

const WISHLIST_KEY = "vlue_shopping_wishlist_v1";
const RESERVATIONS_KEY = "vlue_hub_reservations_v1";
const VISIT_BOOKINGS_KEY = "vlue_hub_visit_bookings_v1";
const SUBSCRIPTIONS_KEY = "vlue_hub_subscriptions_v1";
const EXPENSE_EXPORTS_KEY = "vlue_expense_exports_v1";

export const SHOPPING_CART_HUB_CHANGED = "vlue-shopping-cart-hub-changed";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(SHOPPING_CART_HUB_CHANGED));
  } catch {
    /* ignore */
  }
}

function seedIfEmpty(key, seed) {
  const cur = readJson(key, []);
  if (cur.length) return cur;
  writeJson(key, seed);
  return seed;
}

export function readWishlistItems() {
  return readJson(WISHLIST_KEY, []);
}

export function addWishlistItem(item) {
  const list = readWishlistItems();
  const id = item.id || `wish_${Date.now()}`;
  if (list.some((r) => r.id === id)) return list;
  const next = [
    {
      id,
      productId: item.productId || null,
      title: String(item.title || "상품").trim(),
      storeName: String(item.storeName || "").trim(),
      priceKrw: Number(item.priceKrw) || 0,
      imageUrl: item.imageUrl || "",
      shareCode: item.shareCode || `VLW-${id.slice(-6).toUpperCase()}`,
      checked: true,
      createdAt: new Date().toISOString()
    },
    ...list
  ];
  writeJson(WISHLIST_KEY, next);
  return next;
}

export function removeWishlistItem(id) {
  const next = readWishlistItems().filter((r) => r.id !== id);
  writeJson(WISHLIST_KEY, next);
  return next;
}

export function setWishlistChecked(id, checked) {
  const next = readWishlistItems().map((r) => (r.id === id ? { ...r, checked: Boolean(checked) } : r));
  writeJson(WISHLIST_KEY, next);
  return next;
}

/** 예약 상품 — 품절·출시예정 등 */
export function readProductReservations() {
  return seedIfEmpty(RESERVATIONS_KEY, [
    {
      id: "res_1",
      title: "VLUE 스마트 명함 리더기",
      storeName: "VLUE 공식",
      status: "출시 예정",
      reserveDate: "2026-06-15",
      note: "출시 알림 예약"
    },
    {
      id: "res_2",
      title: "한정판 원두 1kg",
      storeName: "Soul Cafe",
      status: "품절",
      reserveDate: "2026-05-20",
      note: "입고 시 자동 알림"
    }
  ]);
}

export function addProductReservation(item) {
  const list = readProductReservations();
  const row = {
    id: `res_${Date.now()}`,
    title: String(item.title || "").trim(),
    storeName: String(item.storeName || "").trim(),
    status: item.status || "예약",
    reserveDate: item.reserveDate || new Date().toISOString().slice(0, 10),
    note: item.note || ""
  };
  writeJson(RESERVATIONS_KEY, [row, ...list]);
  return row;
}

/** 단체 식당·방문 예약 */
export function readVisitBookings() {
  return seedIfEmpty(VISIT_BOOKINGS_KEY, [
    {
      id: "visit_1",
      venueName: "역삼 VLUE 라운지",
      visitType: "단체 식사",
      scheduledAt: "2026-06-01 18:30",
      partySize: 12,
      status: "확정"
    }
  ]);
}

export function addVisitBooking(item) {
  const list = readVisitBookings();
  const row = {
    id: `visit_${Date.now()}`,
    venueName: String(item.venueName || "").trim(),
    visitType: item.visitType || "방문",
    scheduledAt: item.scheduledAt || "",
    partySize: Number(item.partySize) || 1,
    status: item.status || "대기"
  };
  writeJson(VISIT_BOOKINGS_KEY, [row, ...list]);
  return row;
}

/** 구독 상품 + VLUE 요금제 */
export function readHubSubscriptions() {
  return seedIfEmpty(SUBSCRIPTIONS_KEY, [
    {
      id: "sub_vlue",
      title: "VLUE 유료 멤버십",
      kind: "membership",
      cycle: "monthly",
      amountKrw: 19800,
      nextBillingDate: "2026-06-12",
      status: "활성"
    },
    {
      id: "sub_coffee",
      title: "Soul Cafe 원두 정기배송",
      kind: "product",
      cycle: "monthly",
      amountKrw: 16500,
      nextBillingDate: "2026-06-05",
      status: "활성"
    }
  ]);
}

export function subscriptionsMonthlyTotal() {
  return readHubSubscriptions()
    .filter((s) => s.status === "활성")
    .reduce((sum, s) => sum + (Number(s.amountKrw) || 0), 0);
}

export function isWishlistedProduct(productId) {
  const id = String(productId || "").trim();
  if (!id) return false;
  return readWishlistItems().some((w) => w.productId === id);
}

export function recordExpenseExport({ period, format }) {
  const list = readJson(EXPENSE_EXPORTS_KEY, []);
  const row = {
    id: `exp_${Date.now()}`,
    period: period || "year",
    format: format || "xlsx",
    exportedAt: new Date().toISOString(),
    fileName:
      period === "quarter"
        ? `vlue_expense_${new Date().getFullYear()}_Q${Math.ceil((new Date().getMonth() + 1) / 3)}.xlsx`
        : `vlue_expense_${new Date().getFullYear()}.xlsx`
  };
  writeJson(EXPENSE_EXPORTS_KEY, [row, ...list].slice(0, 20));
  return row;
}

export function buildExpenseCsvDemo(period) {
  const year = new Date().getFullYear();
  const rows = [
    ["일자", "구분", "상점", "품목", "금액(원)", "결제수단", "비고"],
    [`${year}-01-15`, "쇼핑", "VLUE 입점몰 A", "사무용품", "45000", "통합결제", "프로모션 5%"],
    [`${year}-02-03`, "구독", "VLUE", "월 구독료", "19800", "자동결제", "유료회원"],
    [`${year}-03-20`, "쇼핑", "관심상점 B", "기프트", "32000", "부분결제", "1/3회차"]
  ];
  if (period === "quarter") {
    return rows.slice(0, 3).map((r) => r.join(",")).join("\n");
  }
  return rows.map((r) => r.join(",")).join("\n");
}

export function downloadTextFile(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
