/** 푸시 알림 수신함 — 메인 화면 · 채팅 목록 「알림」 탭 */

const KEY = "vlue_push_inbox_v3";

export const PUSH_INBOX_CHANGED = "vlue-push-inbox-changed";

const WELCOME = [
  {
    id: "push-welcome-signup-1",
    category: "앱",
    title: "VLUE에 회원가입을 환영합니다",
    body:
      "가입을 환영합니다. 통화 시 VLUE 쇼케이스·디지털 인증명함으로 신뢰를 전달하고, 친구·주소록 연동으로 지인을 찾을 수 있습니다. 가족보호·신고·제보 기능은 설정에서 켜 주세요. 유료 회원은 쇼케이스 스타일·명함 송출 등 혜택을 바로 이용할 수 있습니다. 민감 정보는 본인 기기·계정에서만 관리되며, 의심 통화는 신고해 주세요.",
    read: false,
    createdAt: new Date().toISOString()
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
    if (!raw) return [...WELCOME];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...WELCOME];
  } catch {
    return [...WELCOME];
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
