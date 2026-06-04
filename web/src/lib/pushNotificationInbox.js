/** 푸시 알림 수신함 — 채팅 목록 「알림」 탭 */

const KEY = "vlue_push_inbox_v1";

export const PUSH_INBOX_CHANGED = "vlue-push-inbox-changed";

const DEMO = [
  {
    id: "push-demo-1",
    category: "쇼핑",
    title: "장바구니 품절",
    body: "장바구니에 담아 두신 「VLUE 텀블러」이 품절되었습니다.",
    time: "방금",
    read: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "push-demo-2",
    category: "배송",
    title: "배송 시작",
    body: "구매하신 상품이 배송 시작되었습니다. (송장번호 000-0000-000)",
    time: "32분 전",
    read: false,
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString()
  },
  {
    id: "push-demo-3",
    category: "안심",
    title: "가족 보호",
    body: "자녀 기기에서 미등록 앱 실행이 감지되었습니다.",
    time: "2시간 전",
    read: true,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  }
];

function readList() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...DEMO];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEMO];
  } catch {
    return [...DEMO];
  }
}

function writeList(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
    window.dispatchEvent(new Event(PUSH_INBOX_CHANGED));
  } catch {
    /* ignore */
  }
}

export function readPushNotifications() {
  return readList().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function countUnreadPush() {
  return readList().filter((n) => !n.read).length;
}

export function addPushNotification({ category = "기타", title = "", body = "", time }) {
  const entry = {
    id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: String(category || "기타").slice(0, 12),
    title: String(title || "").slice(0, 80),
    body: String(body || "").slice(0, 280),
    time: time || "방금",
    read: false,
    createdAt: new Date().toISOString()
  };
  writeList([entry, ...readList()]);
  return entry;
}

export function markPushRead(id) {
  const list = readList().map((n) => (n.id === id ? { ...n, read: true } : n));
  writeList(list);
}

export function markAllPushRead() {
  writeList(readList().map((n) => ({ ...n, read: true })));
}
