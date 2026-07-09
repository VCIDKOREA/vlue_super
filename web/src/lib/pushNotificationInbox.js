/** 푸시 알림 수신함 — 메인 화면 · 채팅 목록 「알림」 탭 */

const KEY = "vlue_push_inbox_v2";

export const PUSH_INBOX_CHANGED = "vlue-push-inbox-changed";

const DEMO = [
  {
    id: "push-demo-family-1",
    category: "가족보호",
    title: "미등록 앱 실행 감지",
    body: "자녀 기기에서 미등록 앱 실행이 감지되었습니다. 원격 앱 목록을 확인해 주세요.",
    read: false,
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString()
  },
  {
    id: "push-demo-family-2",
    category: "가족보호",
    title: "부재중 통화 알림",
    body: "피보호자에게 알 수 없는 번호(010-****-1234)로 부재중 통화가 있었습니다.",
    read: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: "push-demo-app-1",
    category: "앱",
    title: "VLUE 인증 명함 송출",
    body: "발신 통화 시 디지털 인증명함이 정상적으로 송출되었습니다.",
    read: true,
    createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString()
  }
];

/** 알림 목록용 날짜·시간 (예: 7월 6일 오후 3:24) */
export function formatPushNotificationDateTime(iso) {
  try {
    const d = new Date(iso || Date.now());
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleString("ko-KR", {
      ...(sameYear ? {} : { year: "numeric" }),
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "";
  }
}

export function resolvePushDisplayTime(item) {
  const fromIso = formatPushNotificationDateTime(item?.createdAt);
  if (fromIso) return fromIso;
  return String(item?.time || "").trim();
}

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

export function addPushNotification({ category = "기타", title = "", body = "", time, createdAt }) {
  const at = createdAt || new Date().toISOString();
  const entry = {
    id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: String(category || "기타").slice(0, 12),
    title: String(title || "").slice(0, 80),
    body: String(body || "").slice(0, 280),
    time: time || formatPushNotificationDateTime(at),
    read: false,
    createdAt: at
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
