import { normalizePhoneDigits, toKoreaNationalDigits } from "./letteringPhoneMatch.js";

const TTL_MS = 30 * 60 * 1000;
const MAX = 48;
const STORAGE_KEY = "vlue_call_history_peer_v4";
const mem = new Map();

/**
 * callLogList 를 import 하지 않음 —
 * callShowcaseHistory → peerCache → callLogList → callShowcaseHistory 순환으로
 * 통화목록 아바타 resolve 가 TDZ/undefined 에러 나던 경로를 끊는다.
 */
function keyFor(phone) {
  return (
    toKoreaNationalDigits(phone) ||
    normalizePhoneDigits(phone) ||
    String(phone || "").replace(/\D/g, "")
  );
}

function hydrateFromStorage() {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return;
    const now = Date.now();
    for (const row of rows) {
      if (!row?.k || !row?.payload?.card) continue;
      if (now - (row.at || 0) > TTL_MS) continue;
      mem.set(row.k, { at: row.at || now, payload: row.payload });
    }
  } catch {
    /* ignore */
  }
}

function persistToStorage() {
  if (typeof sessionStorage === "undefined") return;
  try {
    const rows = [...mem.entries()]
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, MAX)
      .map(([k, v]) => ({ k, at: v.at, payload: v.payload }));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

hydrateFromStorage();

/** @returns {{ card, showcaseStyle, verified, phone, at } | null} */
export function readCallHistoryPeerCache(phone) {
  const k = keyFor(phone);
  if (!k) return null;
  const row = mem.get(k);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    mem.delete(k);
    persistToStorage();
    return null;
  }
  return row.payload;
}

export function writeCallHistoryPeerCache(phone, payload) {
  const k = keyFor(phone);
  if (!k || !payload?.card) return;
  if (mem.size >= MAX) {
    const oldest = [...mem.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) mem.delete(oldest[0]);
  }
  mem.set(k, { at: Date.now(), payload });
  persistToStorage();
  try {
    window.dispatchEvent(
      new CustomEvent("vlue-call-history-peer-cache-changed", { detail: { phone: k } })
    );
  } catch {
    /* ignore */
  }
}

/** 깨진 아바타 등 — 캐시 무효화 후 재조회 */
export function invalidateCallHistoryPeerCache(phone) {
  const k = keyFor(phone);
  if (!k) return;
  mem.delete(k);
  inflight.delete(k);
  persistToStorage();
}

const inflight = new Map();

/** 동일 번호 중복 fetch 합치기 */
export function prefetchCallHistoryPeer(phone, loader, opts = {}) {
  const k = keyFor(phone);
  if (!k || typeof loader !== "function") return Promise.resolve(null);
  const force = Boolean(opts.force);
  if (!force) {
    const cached = readCallHistoryPeerCache(phone);
    if (cached) return Promise.resolve(cached);
    const existing = inflight.get(k);
    if (existing) return existing;
  } else {
    /* force: 진행 중 prefetch(목록 예열)에 묶이지 않음 — 낡은 unmatched 결과로 팝업이 비는 것 방지 */
    inflight.delete(k);
  }
  const run = loader()
    .then((payload) => {
      if (payload?.card) writeCallHistoryPeerCache(phone, payload);
      return payload;
    })
    .finally(() => {
      if (inflight.get(k) === run) inflight.delete(k);
    });
  inflight.set(k, run);
  return run;
}
