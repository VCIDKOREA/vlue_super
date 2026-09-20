import {
  applyLocalKnownPeersToCallGroups,
  applyKnownContactsToCallGroups,
  applyMemberDirectoryToCallGroups,
  preserveMemberHintsToCallGroups,
  buildCallHistoryList,
  fetchDeviceCallLogEntries
} from "./callLogList.js";
import { applySafeCareLocalToCallGroups } from "./safeCareLocalCache.js";
import { syncDeviceContactsFromNative } from "./contacts/deviceContactsCache.js";
import {
  applyPersistedMemberHintsToCallGroups,
  rememberMemberDirectoryResults
} from "./callHistoryMemberIndex.js";
import { fetchMemberNamesByNumbers } from "./lineCallHistoryApi.js";

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

function enrichWarmSnapshot(rawGroups, prevHint, members) {
  return preserveMemberHintsToCallGroups(
    applyPersistedMemberHintsToCallGroups(
      applySafeCareLocalToCallGroups(
        applyKnownContactsToCallGroups(
          applyLocalKnownPeersToCallGroups(
            applyMemberDirectoryToCallGroups(rawGroups, members || [])
          )
        )
      )
    ),
    prevHint || []
  );
}

/**
 * 앱 기동·탭 진입 전 통화목록 스냅샷 예열.
 * member-names 까지 같이 받아 verified 없는 스냅샷으로 CTA 를「전달」로 쓰지 않음.
 */
export function warmCallHistoryList() {
  if (warmInflight) return warmInflight;
  warmInflight = (async () => {
    await syncDeviceContactsFromNative().catch(() => {});
    const prevHint = readCallHistoryListCache() || [];
    const raw = await fetchDeviceCallLogEntries(200);
    const built = buildCallHistoryList({
      deviceEntries: raw,
      lineEvents: [],
      selectedLine: "all",
      lines: []
    });
    const phones = [
      ...new Set(
        [...prevHint, ...built].map((g) => g.phoneDisplay || g.phone).filter(Boolean)
      )
    ].slice(0, 48);
    /* 1차: 영속 인덱스로 즉시 반영 */
    const quickLocal = enrichWarmSnapshot(built, prevHint, []);
    if (quickLocal.length) {
      writeCallHistoryListCache(quickLocal);
      try {
        window.dispatchEvent(
          new CustomEvent(WARMED_EVENT, { detail: { items: quickLocal } })
        );
      } catch {
        /* ignore */
      }
    }
    /* 2차: member-names — 백그라운드, 끝나면 다시 WARMED */
    let members = null;
    if (phones.length) {
      members = await fetchMemberNamesByNumbers(phones).catch(() => null);
      if (members) rememberMemberDirectoryResults(phones, members);
    }
    const quick = enrichWarmSnapshot(built, quickLocal, members || []);
    if (quick.length) {
      writeCallHistoryListCache(quick);
      try {
        window.dispatchEvent(
          new CustomEvent(WARMED_EVENT, { detail: { items: quick } })
        );
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
