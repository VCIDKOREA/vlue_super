import {
  applyLocalKnownPeersToCallGroups,
  buildCallHistoryList,
  fetchDeviceCallLogEntries
} from "./callLogList.js";

const STORAGE_KEY = "vlue_call_history_list_v1";
const TTL_MS = 20 * 60 * 1000;
const WARMED_EVENT = "vlue-call-history-list-warmed";

let memItems = null;
let memAt = 0;
let warmInflight = null;

export function readCallHistoryListCache() {
  if (memItems?.length && Date.now() - memAt < TTL_MS) return memItems;
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.items) || Date.now() - (parsed.at || 0) > TTL_MS) return null;
    memItems = parsed.items;
    memAt = parsed.at || Date.now();
    return memItems;
  } catch {
    return null;
  }
}

export function writeCallHistoryListCache(items) {
  if (!Array.isArray(items) || !items.length) return;
  memItems = items;
  memAt = Date.now();
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: memAt, items }));
  } catch {
    /* ignore */
  }
}

/** 앱 기동·탭 진입 전 통화목록 스냅샷 예열 */
export function warmCallHistoryList() {
  if (warmInflight) return warmInflight;
  warmInflight = (async () => {
    const raw = await fetchDeviceCallLogEntries(200);
    const quick = applyLocalKnownPeersToCallGroups(
      buildCallHistoryList({
        deviceEntries: raw,
        lineEvents: [],
        selectedLine: "all",
        lines: []
      })
    );
    if (quick.length) {
      writeCallHistoryListCache(quick);
      try {
        window.dispatchEvent(new Event(WARMED_EVENT));
      } catch {
        /* ignore */
      }
    }
    return quick;
  })().finally(() => {
    warmInflight = null;
  });
  return warmInflight;
}

export const CALL_HISTORY_LIST_WARMED = WARMED_EVENT;
