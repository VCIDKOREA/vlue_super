/**
 * 마이케이스 프로필 — 인스타 스토리형 「송출 중」링 조회 상태
 * fingerprint 가 바뀌면(송출 갱신) 다시 미확인(컬러 링)
 */

const STORAGE_KEY = "vlue_mycase_story_seen_v1";

function readMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** @param {string} ownerUserId @param {Array<{ id?: string, updatedAt?: string, createdAt?: string }>} items */
export function broadcastStoryFingerprint(ownerUserId, items = []) {
  const parts = (Array.isArray(items) ? items : [])
    .map((it) => `${String(it?.id || "")}:${String(it?.updatedAt || it?.createdAt || "")}`)
    .filter((s) => !s.startsWith(":"))
    .sort();
  return `${String(ownerUserId || "").trim()}|${parts.join(",")}`;
}

/** 메인 송출이 있고 아직 확인하지 않았으면 true */
export function isBroadcastStoryUnseen(ownerUserId, items = []) {
  if (!Array.isArray(items) || items.length === 0) return false;
  const owner = String(ownerUserId || "").trim();
  if (!owner) return false;
  const fp = broadcastStoryFingerprint(owner, items);
  const map = readMap();
  return map[owner] !== fp;
}

export function markBroadcastStorySeen(ownerUserId, items = []) {
  const owner = String(ownerUserId || "").trim();
  if (!owner || !items?.length) return;
  const map = readMap();
  map[owner] = broadcastStoryFingerprint(owner, items);
  writeMap(map);
}
