import { callLogPhoneKey } from "./callLogList.js";

const TTL_MS = 30 * 60 * 1000;
const MAX = 48;
const STORAGE_KEY = "vlue_call_history_peer_v2";
const mem = new Map();

function keyFor(phone) {
  return callLogPhoneKey(phone) || String(phone || "").replace(/\D/g, "");
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
}

const inflight = new Map();

/** 동일 번호 중복 fetch 합치기 */
export function prefetchCallHistoryPeer(phone, loader) {
  const k = keyFor(phone);
  if (!k || typeof loader !== "function") return Promise.resolve(null);
  const cached = readCallHistoryPeerCache(phone);
  if (cached) return Promise.resolve(cached);
  const existing = inflight.get(k);
  if (existing) return existing;
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
