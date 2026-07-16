/**
 * SoundCloud 지역 제한·재생 불가 트랙 기록 (기기 로컬)
 */

const STORAGE_KEY = "vlue_sc_bgm_blocked_v1";

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRaw(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** @param {string} trackKey trackId 또는 trackUrl */
export function isShowcaseBgmBlocked(trackKey) {
  const k = String(trackKey || "").trim();
  if (!k) return false;
  const map = readRaw();
  return Boolean(map[k]);
}

/** @param {string[]} keys */
export function markShowcaseBgmBlocked(...keys) {
  const map = readRaw();
  let changed = false;
  for (const key of keys) {
    const k = String(key || "").trim();
    if (!k || map[k]) continue;
    map[k] = Date.now();
    changed = true;
  }
  if (changed) writeRaw(map);
  return changed;
}

/** @returns {Set<string>} */
export function readShowcaseBgmBlockedSet() {
  return new Set(Object.keys(readRaw()));
}
