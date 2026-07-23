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

/**
 * @param {object} opts
 * @param {string} [opts.category]
 * @param {string} [opts.title]
 * @param {string} [opts.body]
 * @param {string} [opts.time]
 * @param {string} [opts.createdAt]
 * @param {"payment"|string} [opts.kind]
 * @param {string} [opts.productName]
 * @param {string} [opts.productDetail]
 * @param {number} [opts.amountKrw]
 * @param {string} [opts.paymentId]
 * @param {boolean} [opts.needsPurchaseConfirm]
 */
export function addPushNotification({
  category = "기타",
  title = "",
  body = "",
  time,
  createdAt,
  kind,
  productName,
  productDetail,
  amountKrw,
  paymentId,
  needsPurchaseConfirm
} = {}) {
  const at = createdAt || new Date().toISOString();
  const isPayment = kind === "payment" || category === "결제";
  const entry = {
    id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: String(category || "기타").slice(0, 12),
    title: String(title || "").slice(0, 80),
    body: String(body || "").slice(0, isPayment ? 1200 : 280),
    time: time || formatPushNotificationDateTime(at),
    read: false,
    createdAt: at,
    kind: kind || null,
    productName: productName ? String(productName).slice(0, 120) : null,
    productDetail: productDetail ? String(productDetail).slice(0, 800) : null,
    amountKrw: Number.isFinite(Number(amountKrw)) ? Math.floor(Number(amountKrw)) : null,
    paymentId: paymentId ? String(paymentId).slice(0, 80) : null,
    needsPurchaseConfirm: Boolean(needsPurchaseConfirm ?? isPayment),
    purchaseConfirmed: false,
    purchaseConfirmedAt: null
  };
  writeList([entry, ...readList()]);
  return entry;
}

/** 쇼핑 구매확정과 동일 — 알림에서 구매확인 완료 처리 */
export function confirmPushPurchase(id) {
  const at = new Date().toISOString();
  let updated = null;
  const list = readList().map((n) => {
    if (n.id !== id) return n;
    updated = {
      ...n,
      read: true,
      purchaseConfirmed: true,
      purchaseConfirmedAt: at
    };
    return updated;
  });
  writeList(list);
  return updated;
}

export function markPushRead(id) {
  const list = readList().map((n) => (n.id === id ? { ...n, read: true } : n));
  writeList(list);
}

export function markAllPushRead() {
  writeList(readList().map((n) => ({ ...n, read: true })));
}

/** 결제 알림 본문 — 감사 인사로 시작 + 상품 상세 */
export function buildPaymentReceiptBody({
  productName = "VLUE 상품",
  productDetail = "",
  amountKrw = 0,
  paymentId = ""
} = {}) {
  const name = String(productName || "VLUE 상품").trim();
  const detail =
    String(productDetail || "").trim() ||
    `${name} 결제가 정상 처리되었습니다. 결제 내역은 VLUE 계정에 안전하게 보관됩니다.`;
  const amount = Math.max(0, Math.floor(Number(amountKrw) || 0)).toLocaleString("ko-KR");
  const lines = [
    "구매해 주셔서 진심으로 감사합니다.",
    "",
    `구매 상품: ${name}`,
    `상품 설명: ${detail}`,
    `결제 금액: ${amount}원`
  ];
  if (paymentId) lines.push(`결제 번호: ${paymentId}`);
  lines.push("", "아래 [구매확인]을 눌러 주시면 구매가 확정됩니다.");
  return lines.join("\n");
}
