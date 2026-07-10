import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";

export const CALL_SHOWCASE_HISTORY_KEY = "vlue_call_showcase_history_v1";
export const CALL_SHOWCASE_HISTORY_CHANGED = "vlue-call-showcase-history-changed";

const DEMO_ENTRIES = [
  {
    id: "demo-kim",
    phone: "010-5555-1234",
    name: "김친구",
    direction: "in",
    durationSec: 271,
    endedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: "demo-jiyeon",
    phone: "010-7777-8888",
    name: "지연",
    direction: "out",
    durationSec: 184,
    endedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "demo-minsu",
    phone: "010-3333-4444",
    name: "민수",
    direction: "in",
    durationSec: 92,
    endedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
  }
];

function emitChange() {
  window.dispatchEvent(new CustomEvent(CALL_SHOWCASE_HISTORY_CHANGED));
}

export function readCallShowcaseHistory() {
  try {
    const raw = localStorage.getItem(CALL_SHOWCASE_HISTORY_KEY);
    if (!raw) return [...DEMO_ENTRIES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEMO_ENTRIES];
    return parsed;
  } catch {
    return [...DEMO_ENTRIES];
  }
}

export function appendCallShowcaseHistory(entry) {
  const phone = String(entry?.phone || "").trim();
  if (!phone) return null;
  const row = {
    id: entry.id || `call-${Date.now()}`,
    phone,
    phoneDisplay: formatLetteringPhoneDisplay(phone),
    name: String(entry.name || "").trim() || formatLetteringPhoneDisplay(phone),
    direction: entry.direction === "out" ? "out" : "in",
    durationSec: Math.max(0, Number(entry.durationSec) || 0),
    endedAt: entry.endedAt || new Date().toISOString(),
    callState: entry.callState || (Number(entry.durationSec) > 0 ? "ended" : "missed"),
    verified: entry.verified !== false,
    membershipTier: entry.membershipTier || "free",
    /** 통화 종료·부재중 시 쇼케이스 메타데이터 스냅샷 */
    showcaseSnapshot: entry.showcaseSnapshot || null,
    cardSnapshot: entry.cardSnapshot || null
  };
  const next = [row, ...readCallShowcaseHistory().filter((r) => r.id !== row.id)].slice(0, 80);
  try {
    localStorage.setItem(CALL_SHOWCASE_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emitChange();
  return row;
}

export function formatCallDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatCallWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}
