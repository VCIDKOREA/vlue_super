/** API 미연결 시 개인 메모 로컬 저장 */

const KEY = "vlue_local_personal_memos_v1";

export const LOCAL_MEMO_CHANGED = "vlue-local-memo-changed";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 800)));
    window.dispatchEvent(new Event(LOCAL_MEMO_CHANGED));
  } catch {
    /* quota */
  }
}

export function readLocalMemos() {
  return readAll();
}

export function upsertLocalMemo(memo) {
  const id = memo.id || `local-memo-${Date.now()}`;
  const next = {
    ...memo,
    id,
    source: memo.source || "local",
    updatedAt: new Date().toISOString(),
    createdAt: memo.createdAt || new Date().toISOString()
  };
  const list = readAll().filter((m) => m.id !== id);
  writeAll([next, ...list]);
  return next;
}

export function removeLocalMemo(id) {
  writeAll(readAll().filter((m) => m.id !== id));
}

export function mergeMemos(remote = [], local = []) {
  const map = new Map();
  for (const m of [...local, ...remote]) {
    if (m?.id) map.set(m.id, m);
  }
  return [...map.values()].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function localMemoMeta(list) {
  const sorted = [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const latest = sorted[0];
  const preview = latest
    ? String(latest.title || latest.content || "").slice(0, 80)
    : "";
  const unreadShareCount = list.filter((m) => m.isUnread && m.type === "share").length;
  return { count: list.length, preview, unreadShareCount };
}
