/** 대표·채팅·피드·명함 슬롯별 프로필 이미지 (Data URL 또는 https URL 권장 — blob: 은 세션 후 깨짐) */

const KEYS = {
  primary: "vlue_avatar_primary",
  chat: "vlue_avatar_chat",
  feed: "vlue_avatar_feed",
  card: "vlue_avatar_card"
};

export function readAvatar(slot = "primary") {
  try {
    const direct = localStorage.getItem(KEYS[slot] || KEYS.primary);
    if (direct && !String(direct).startsWith("blob:")) return direct;
    const fallback = localStorage.getItem(KEYS.primary);
    if (fallback && !String(fallback).startsWith("blob:")) return fallback;
  } catch {
    /* ignore */
  }
  return "";
}

export function writeAvatar(slot, dataUrlOrUrl) {
  try {
    const k = KEYS[slot] || KEYS.primary;
    const v = String(dataUrlOrUrl || "").trim();
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
    window.dispatchEvent(new Event("vlue-avatar-changed"));
  } catch {
    /* ignore */
  }
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
