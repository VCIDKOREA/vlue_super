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
  return readList().sort((a, b) => {
    const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pin) return pin;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
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
 * @param {string} [opts.serverId]
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
  needsPurchaseConfirm,
  serverId,
  read = false,
  pinned = false,
  pinKind = null,
  pinKey = null
} = {}) {
  const at = createdAt || new Date().toISOString();
  const sid = String(serverId || "").trim();
  const key = String(pinKey || "").trim();
  const list = readList();
  if (sid) {
    const idx = list.findIndex((n) => String(n.serverId || "") === sid);
    if (idx >= 0) {
      const next = {
        ...list[idx],
        title: String(title || list[idx].title || "").slice(0, 80),
        body: String(body || list[idx].body || "").slice(0, 1200),
        pinned: Boolean(pinned),
        pinKind: pinKind || list[idx].pinKind || null,
        pinKey: key || list[idx].pinKey || null,
        read: Boolean(pinned) ? false : list[idx].read
      };
      const copy = [...list];
      copy[idx] = next;
      writeList(copy);
      return { ...next, isNew: false };
    }
  }
  if (key) {
    const idx = list.findIndex((n) => String(n.pinKey || "") === key);
    if (idx >= 0) {
      const next = {
        ...list[idx],
        title: String(title || list[idx].title || "").slice(0, 80),
        body: String(body || list[idx].body || "").slice(0, 1200),
        pinned: Boolean(pinned),
        pinKind: pinKind || list[idx].pinKind || null,
        serverId: sid || list[idx].serverId || null
      };
      const copy = [...list];
      copy[idx] = next;
      writeList(copy);
      return { ...next, isNew: false };
    }
  }
  const isPayment = kind === "payment" || category === "결제";
  const entry = {
    id: sid ? `push-srv-${sid}` : `push-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    serverId: sid || null,
    category: String(category || "기타").slice(0, 12),
    title: String(title || "").slice(0, 80),
    body: String(body || "").slice(0, isPayment || pinned ? 1200 : 280),
    time: time || formatPushNotificationDateTime(at),
    read: Boolean(read) && !pinned,
    createdAt: at,
    kind: kind || null,
    productName: productName ? String(productName).slice(0, 120) : null,
    productDetail: productDetail ? String(productDetail).slice(0, 800) : null,
    amountKrw: Number.isFinite(Number(amountKrw)) ? Math.floor(Number(amountKrw)) : null,
    paymentId: paymentId ? String(paymentId).slice(0, 80) : null,
    needsPurchaseConfirm: Boolean(needsPurchaseConfirm ?? (isPayment && !pinned)),
    purchaseConfirmed: false,
    purchaseConfirmedAt: null,
    pinned: Boolean(pinned),
    pinKind: pinKind || null,
    pinKey: key || null
  };
  writeList([entry, ...list]);
  return { ...entry, isNew: true };
}

export function prunePinnedPushNotIn(pinKeys = []) {
  const keep = new Set((pinKeys || []).map((k) => String(k || "").trim()).filter(Boolean));
  const list = readList();
  const next = list.filter((n) => {
    if (!n.pinned || !n.pinKey) return true;
    return keep.has(String(n.pinKey));
  });
  if (next.length !== list.length) writeList(next);
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
  lines.push(
    "",
    "아래 [구매확인]을 눌러 주시면 구매가 확정됩니다.",
    "환불이 필요하시면 [환불 문의]로 고객센터(support@vlue.kr)에 신청해 주세요."
  );
  return lines.join("\n");
}

/** 결제 알림 → 환불·청약철회 메일 문의 (사전 작성) */
export function buildRefundInquiryMailto({
  productName = "",
  amountKrw = null,
  paymentId = "",
  handle = ""
} = {}) {
  const subject = encodeURIComponent("[VLUE] 환불·청약철회 문의");
  const amountLabel =
    amountKrw != null && Number.isFinite(Number(amountKrw))
      ? `${Math.floor(Number(amountKrw)).toLocaleString("ko-KR")}원`
      : "";
  const lines = [
    "안녕하세요. 환불·청약철회를 신청합니다.",
    "",
    `회원 ID: ${handle || "(작성해 주세요)"}`,
    `구매 상품: ${String(productName || "").trim() || "(알 수 없음)"}`,
    `결제 금액: ${amountLabel || "(작성해 주세요)"}`,
    `결제 번호: ${String(paymentId || "").trim() || "(작성해 주세요)"}`,
    "결제수단: (작성해 주세요)",
    "사유: (작성해 주세요)",
    "",
    "※ 접수 후 영업일 3일 이내 회신 예정입니다."
  ];
  return `mailto:support@vlue.kr?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
}
