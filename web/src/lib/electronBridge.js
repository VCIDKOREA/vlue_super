/**
 * Electron IPC bridge — renderer ↔ main process
 */

/** @returns {boolean} */
export function isElectronApp() {
  if (typeof window === "undefined") return false;
  if (window.vlueElectron?.isElectron) return true;
  return String(navigator?.userAgent || "").includes("VLUE-PC-App");
}

/**
 * @param {{ roomId: string, roomType: 'GENERAL'|'MAIL_TALK', title?: string, counterpartyEmail?: string }} payload
 * @returns {boolean} true if handled by Electron
 */
export function openElectronRoomWindow(payload) {
  if (!isElectronApp() || !window.vlueElectron?.openRoomWindow) return false;
  window.vlueElectron.openRoomWindow(payload);
  return true;
}

/**
 * @param {(data: { side: 'left'|'right' }) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeMagneticSide(callback) {
  if (!isElectronApp() || !window.vlueElectron?.onMagneticSide) return () => {};
  return window.vlueElectron.onMagneticSide(callback);
}

/** @returns {Promise<'left'|'right'>} */
export async function fetchMagneticSide() {
  if (!isElectronApp() || !window.vlueElectron?.getMagneticSide) return "left";
  const data = await window.vlueElectron.getMagneticSide();
  return data?.side === "right" ? "right" : "left";
}

/**
 * @returns {{ roomType: 'GENERAL'|'MAIL_TALK', roomId: string, title?: string, counterpartyEmail?: string } | null}
 */
export function getElectronRoomBootParams() {
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("vlueElectronRoom") !== "1") return null;
    const roomType = u.searchParams.get("roomType") === "MAIL_TALK" ? "MAIL_TALK" : "GENERAL";
    const roomId = String(u.searchParams.get("roomId") || "").trim();
    if (!roomId) return null;
    return {
      roomType,
      roomId,
      title: u.searchParams.get("title") || "",
      counterpartyEmail: u.searchParams.get("counterpartyEmail") || ""
    };
  } catch {
    return null;
  }
}

/** @returns {boolean} */
export function isElectronRoomWindow() {
  return Boolean(getElectronRoomBootParams());
}

/** @param {string} url */
export function openInAppLink(url) {
  if (!url) return;
  if (isElectronApp()) {
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** 장문 메일 본문 판별 */
export function isLongFormMailMessage(message) {
  if (!message || message.direction === "SENT") return false;
  if (message.bodyHtml && String(message.bodyHtml).trim().length > 80) return true;
  const text = String(message.rawBodyText || message.bodyText || "");
  return text.length > 280 || text.split("\n").length > 6;
}
