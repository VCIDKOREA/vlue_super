/** 채팅방 로컬 설정 — 상단고정·이름·알림·숨김 */

const KEY = "vlue_chat_room_prefs_v1";

export const CHAT_ROOM_PREFS_CHANGED = "vlue-chat-room-prefs-changed";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(CHAT_ROOM_PREFS_CHANGED));
  } catch {
    /* ignore */
  }
}

export function readRoomPrefs(roomId) {
  const id = String(roomId || "").trim();
  if (!id) return {};
  return readAll()[id] || {};
}

export function patchRoomPrefs(roomId, patch) {
  const id = String(roomId || "").trim();
  if (!id) return;
  const map = readAll();
  map[id] = { ...(map[id] || {}), ...patch };
  writeAll(map);
}

export function toggleRoomPinned(roomId) {
  const prev = readRoomPrefs(roomId);
  patchRoomPrefs(roomId, { pinned: !prev.pinned });
  return !prev.pinned;
}

export function setRoomDisplayName(roomId, displayName) {
  patchRoomPrefs(roomId, { displayName: String(displayName || "").trim() });
}

export function toggleRoomMuted(roomId) {
  const prev = readRoomPrefs(roomId);
  patchRoomPrefs(roomId, { muted: !prev.muted });
  return !prev.muted;
}

export function setRoomHidden(roomId, hidden = true) {
  patchRoomPrefs(roomId, { hidden: Boolean(hidden) });
}

/** 브이밍 상단 패널 접힘 (기본: 접힘) */
export function isVmingPanelCollapsed(roomId) {
  const prefs = readRoomPrefs(roomId);
  if (prefs.vmingPanelExpanded === true) return false;
  if (prefs.vmingPanelCollapsed === false) return false;
  return true;
}

export function setVmingPanelCollapsed(roomId, collapsed) {
  patchRoomPrefs(roomId, {
    vmingPanelCollapsed: Boolean(collapsed),
    vmingPanelExpanded: collapsed ? false : true
  });
}

const GROUP_VMING_DEFAULT_KEY = "vlue_group_create_vming_default";

/** 그룹방 생성 시 브이밍 AI 호출 체크 기본값 */
export function readGroupCreateVmingDefault() {
  try {
    return localStorage.getItem(GROUP_VMING_DEFAULT_KEY) !== "0";
  } catch {
    return false;
  }
}

export function setGroupCreateVmingDefault(enabled) {
  try {
    localStorage.setItem(GROUP_VMING_DEFAULT_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function consumeAutoRequestVming(roomId) {
  const prefs = readRoomPrefs(roomId);
  if (!prefs.autoRequestVming) return null;
  const payload = {
    members: prefs.vmingMembers || [],
    config: prefs.vmingConsentConfig || {
      consentMode: "all",
      validityDays: 90,
      sessionOnly: false
    }
  };
  patchRoomPrefs(roomId, {
    autoRequestVming: false,
    vmingMembers: undefined,
    vmingConsentConfig: undefined
  });
  return payload;
}

export function scheduleAutoRequestVming(roomId, { members = [], config } = {}) {
  patchRoomPrefs(roomId, {
    autoRequestVming: true,
    vmingMembers: members,
    vmingConsentConfig: config || {
      consentMode: "all",
      validityDays: 90,
      sessionOnly: false
    }
  });
}
