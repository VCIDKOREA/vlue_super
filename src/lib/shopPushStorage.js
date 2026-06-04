/** 상점 게시물 푸시 — 알림을 켠 구독자에게만 발송 (상점 주인 본인 제외) */

const SUBSCRIBERS_KEY = "vlue_shop_push_subscribers_v1";
const MY_SUBSCRIPTIONS_KEY = "vlue_my_subscribe_shop_ids_v1";

export const SHOP_PUSH_SUBSCRIBERS_CHANGED = "vlue-shop-push-subscribers-changed";
export const SHOP_PUSH_TO_SUBSCRIBER = "vlue-push-shop-post";
export const SHOP_OWNER_POSTED = "vlue-shop-owner-posted";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function getCurrentUserId() {
  try {
    return localStorage.getItem("vlue_server_user_id") || "local-user";
  } catch {
    return "local-user";
  }
}

function readAllSubscriberMap() {
  const map = readJson(SUBSCRIBERS_KEY, {});
  return map && typeof map === "object" ? map : {};
}

function writeAllSubscriberMap(map) {
  writeJson(SUBSCRIBERS_KEY, map);
  window.dispatchEvent(new Event(SHOP_PUSH_SUBSCRIBERS_CHANGED));
}

/** 내 상점(페이지)에 알림 설정을 켠 회원 목록 — 마이페이지 알림설정 탭용 */
export function readPushSubscribersForOwner(ownerKey) {
  const key = String(ownerKey || "").trim();
  if (!key) return [];
  const list = readAllSubscriberMap()[key];
  return Array.isArray(list) ? list : [];
}

export function countPushSubscribersForOwner(ownerKey) {
  return readPushSubscribersForOwner(ownerKey).length;
}

/** 다른 상점 알림 받기 (소비자) */
export function enablePushForShop({ ownerKey, shopId, shopName, displayName }) {
  const owner = String(ownerKey || "").trim();
  const userId = getCurrentUserId();
  if (!owner || owner === userId) return { ok: false, reason: "own-shop" };
  const map = readAllSubscriberMap();
  const prev = Array.isArray(map[owner]) ? map[owner] : [];
  if (prev.some((s) => s.userId === userId)) return { ok: true, already: true };
  const entry = {
    userId,
    displayName: String(displayName || "회원").slice(0, 24),
    shopId: String(shopId || ""),
    shopName: String(shopName || "상점").slice(0, 40),
    enabledAt: new Date().toISOString()
  };
  map[owner] = [entry, ...prev].slice(0, 500);
  writeAllSubscriberMap(map);
  return { ok: true, entry };
}

export function disablePushForShop(ownerKey) {
  const owner = String(ownerKey || "").trim();
  const userId = getCurrentUserId();
  const map = readAllSubscriberMap();
  const prev = Array.isArray(map[owner]) ? map[owner] : [];
  map[owner] = prev.filter((s) => s.userId !== userId);
  writeAllSubscriberMap(map);
  return { ok: true };
}

export function isPushEnabledForShop(ownerKey) {
  const owner = String(ownerKey || "").trim();
  const userId = getCurrentUserId();
  return readPushSubscribersForOwner(owner).some((s) => s.userId === userId);
}

/** 내가 구독한 업데이트 스토리 상점 id */
export function readSubscribedShopIds() {
  const ids = readJson(MY_SUBSCRIPTIONS_KEY, []);
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id.trim()) : [];
}

export function toggleSubscribedShop(shopId) {
  const id = String(shopId || "").trim();
  if (!id) return { ok: false };
  const prev = readSubscribedShopIds();
  const exists = prev.includes(id);
  const next = exists ? prev.filter((x) => x !== id) : [id, ...prev];
  writeJson(MY_SUBSCRIPTIONS_KEY, next.slice(0, 120));
  window.dispatchEvent(new Event("vlue-subscribe-shops-changed"));
  return { ok: true, subscribed: !exists, ids: next };
}

/** 상점 주인이 게시 시 — 알림 설정 회원에게만 푸시 이벤트 */
export function dispatchPushToShopSubscribers(ownerKey, payload = {}) {
  const owner = String(ownerKey || "").trim();
  const subs = readPushSubscribersForOwner(owner);
  let sent = 0;
  subs.forEach((sub) => {
    if (!sub?.userId || sub.userId === owner) return;
    window.dispatchEvent(
      new CustomEvent(SHOP_PUSH_TO_SUBSCRIBER, {
        detail: {
          targetUserId: sub.userId,
          shopName: payload.shopName || sub.shopName || "상점",
          title: payload.title || "새 게시물",
          ownerKey: owner
        }
      })
    );
    sent += 1;
  });
  return { count: sent, subscribers: subs };
}

/** 데모: 알림 설정 회원이 없을 때 샘플 표시용 */
export function ensureDemoPushSubscribers(ownerKey) {
  const owner = String(ownerKey || "").trim();
  if (!owner || readPushSubscribersForOwner(owner).length > 0) return;
  const map = readAllSubscriberMap();
  map[owner] = [
    { userId: "demo-sub-1", displayName: "김구독", shopName: "VLUE PAGE", enabledAt: new Date().toISOString() },
    { userId: "demo-sub-2", displayName: "이알림", shopName: "VLUE PAGE", enabledAt: new Date().toISOString() },
    { userId: "demo-sub-3", displayName: "박푸시", shopName: "VLUE PAGE", enabledAt: new Date().toISOString() }
  ];
  writeAllSubscriberMap(map);
}
