const SEEN_KEY = "vlue_friend_showcase_seen_v1";
const ACTIVITY_KEY = "vlue_friend_showcase_activity_v1";
export const FRIEND_SHOWCASE_ACTIVITY_EVENT = "vlue-friend-showcase-activity";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

/** @returns {Record<string, number>} friendId → last seen ms */
export function readFriendShowcaseSeen() {
  return readJson(SEEN_KEY, {});
}

/** @returns {Record<string, number>} friendId → last showcase update ms */
export function readFriendShowcaseActivity() {
  return readJson(ACTIVITY_KEY, {});
}

/**
 * 친구 쇼케이스 업데이트 시각 (카탈로그 필드 + 로컬 활동)
 * @param {{ id?: string, showcaseUpdatedAt?: number|string, updatedAt?: number|string, lastActiveAt?: number|string }} friend
 */
export function resolveFriendShowcaseUpdatedAt(friend) {
  const id = String(friend?.id || "");
  const raw = friend?.showcaseUpdatedAt || friend?.updatedAt || friend?.lastActiveAt || 0;
  let fromFriend = Number(raw);
  if (!fromFriend && raw) {
    const parsed = Date.parse(String(raw));
    fromFriend = Number.isFinite(parsed) ? parsed : 0;
  }
  const fromActivity = id ? Number(readFriendShowcaseActivity()[id] || 0) : 0;
  return Math.max(fromFriend || 0, fromActivity || 0);
}

export function isFriendShowcaseUnread(friend) {
  const id = String(friend?.id || "");
  if (!id) return false;
  const updatedAt = resolveFriendShowcaseUpdatedAt(friend);
  if (!updatedAt) return false;
  const seen = Number(readFriendShowcaseSeen()[id] || 0);
  return updatedAt > seen;
}

export function countUnreadFriendShowcases(entries = []) {
  return (entries || []).filter((e) => isFriendShowcaseUnread(e)).length;
}

export function markFriendShowcaseSeen(friendId, at = Date.now()) {
  const id = String(friendId || "");
  if (!id) return;
  const next = { ...readFriendShowcaseSeen(), [id]: Math.max(Number(at) || Date.now(), Number(readFriendShowcaseSeen()[id] || 0)) };
  writeJson(SEEN_KEY, next);
  window.dispatchEvent(new CustomEvent(FRIEND_SHOWCASE_ACTIVITY_EVENT));
}

export function markAllFriendShowcasesSeen(entries = []) {
  const next = { ...readFriendShowcaseSeen() };
  const now = Date.now();
  for (const e of entries) {
    const id = String(e?.id || "");
    if (!id) continue;
    const updatedAt = resolveFriendShowcaseUpdatedAt(e);
    next[id] = Math.max(next[id] || 0, updatedAt || now);
  }
  writeJson(SEEN_KEY, next);
  window.dispatchEvent(new CustomEvent(FRIEND_SHOWCASE_ACTIVITY_EVENT));
}

/** 서버·실시간에서 친구 쇼케이스 갱신 시 호출 */
export function bumpFriendShowcaseActivity(friendId, at = Date.now()) {
  const id = String(friendId || "");
  if (!id) return;
  const next = { ...readFriendShowcaseActivity(), [id]: Math.max(Number(at) || Date.now(), Number(readFriendShowcaseActivity()[id] || 0)) };
  writeJson(ACTIVITY_KEY, next);
  window.dispatchEvent(new CustomEvent(FRIEND_SHOWCASE_ACTIVITY_EVENT, { detail: { friendId: id, at: next[id] } }));
}
