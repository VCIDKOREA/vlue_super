/** 채팅 메시지 UI — 날짜 구분·연속 묶음·타임스탬프 */

const ONE_MINUTE_MS = 60 * 1000;

function sameSender(a, b) {
  if (!a || !b) return false;
  if (a.type === "system" || b.type === "system") return false;
  if (a.type !== b.type) return false;
  if (a.type === "target") {
    const aKey = a.senderId || a.senderName || "";
    const bKey = b.senderId || b.senderName || "";
    if (aKey && bKey) return aKey === bKey;
  }
  return true;
}

function parseMessageAt(msg) {
  if (msg?.at) {
    const d = new Date(msg.at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (msg?.scheduledAt) {
    const d = new Date(msg.scheduledAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** 목록 내 연속 동일 발신 묶음의 첫 인덱스 */
function clusterHeadIndex(list, index) {
  const msg = list[index];
  if (!msg) return index;
  let head = index;
  while (head > 0) {
    const prev = list[head - 1];
    if (!prev || prev.type === "system" || !sameSender(prev, msg)) break;
    head -= 1;
  }
  return head;
}

/** at 없을 때 — 같은 발신자 연속 구간은 1분 이내로 붙여 클러스터 판정이 되게 함 */
function syntheticAtForIndex(list, index) {
  const msg = list[index];
  const head = clusterHeadIndex(list, index);
  const headParsed = parseMessageAt(list[head]);
  const base = headParsed || (() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    d.setMinutes(d.getMinutes() + head * 4);
    return d;
  })();
  const offset = index - head;
  const d = new Date(base);
  d.setSeconds(d.getSeconds() + Math.min(offset, 8) * 8);
  return d;
}

export function messageAt(msg, index = 0, list = null) {
  const parsed = parseMessageAt(msg);
  if (parsed) return parsed;
  if (Array.isArray(list) && list.length > 0) {
    return syntheticAtForIndex(list, index);
  }
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  base.setMinutes(base.getMinutes() + index * 4);
  return base;
}

export function formatDatePill(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function dateKeyOf(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function enrichMessagesForUi(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return list.map((msg, idx) => {
    if (msg.type === "system") {
      return {
        ...msg,
        uiAt: messageAt(msg, idx),
        uiDateKey: dateKeyOf(messageAt(msg, idx)),
        uiShowDate: false,
        uiClusterHead: true,
        uiClusterTail: true,
        uiShowAvatar: false,
        uiShowName: false,
        uiShowTime: false
      };
    }

    const uiAt = messageAt(msg, idx, list);
    const uiDateKey = dateKeyOf(uiAt);
    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx < list.length - 1 ? list[idx + 1] : null;

    const prevAt = prev && prev.type !== "system" ? messageAt(prev, idx - 1, list) : null;
    const nextAt = next && next.type !== "system" ? messageAt(next, idx + 1, list) : null;

    const prevSame =
      prev &&
      sameSender(prev, msg) &&
      prevAt &&
      uiAt.getTime() - prevAt.getTime() <= ONE_MINUTE_MS;
    const nextSame =
      next &&
      sameSender(next, msg) &&
      nextAt &&
      nextAt.getTime() - uiAt.getTime() <= ONE_MINUTE_MS;

    const prevDateKey = prev ? dateKeyOf(messageAt(prev, idx - 1, list)) : "";
    const uiShowDate = uiDateKey !== prevDateKey;

    return {
      ...msg,
      uiAt,
      uiDateKey,
      uiShowDate,
      uiClusterHead: !prevSame,
      uiClusterTail: !nextSame,
      uiShowAvatar: msg.type !== "me" && !prevSame,
      uiShowName: msg.type !== "me" && !prevSame,
      uiShowTime: !nextSame,
      showTime: !nextSame,
      timeText: msg.timeText || uiAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    };
  });
}

export function simulatePeerOnline(roomId) {
  const id = String(roomId || "");
  if (id.startsWith("subscribe:")) return true;
  if (id.includes(":grp-")) return false;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * 17) % 100;
  return hash > 28;
}
