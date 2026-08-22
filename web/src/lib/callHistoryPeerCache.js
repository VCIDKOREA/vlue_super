import { callLogPhoneKey } from "./callLogList.js";

const TTL_MS = 5 * 60 * 1000;
const MAX = 48;
const mem = new Map();

function keyFor(phone) {
  return callLogPhoneKey(phone) || String(phone || "").replace(/\D/g, "");
}

/** @returns {{ card, showcaseStyle, verified, phone, at } | null} */
export function readCallHistoryPeerCache(phone) {
  const k = keyFor(phone);
  if (!k) return null;
  const row = mem.get(k);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    mem.delete(k);
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
