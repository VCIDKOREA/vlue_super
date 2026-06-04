const MODE_KEY = "vlue_app_mode";
const CARD_KEY = "vlue_active_office_card_id";

export function readAppMode() {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === "office" ? "office" : "personal";
  } catch {
    return "personal";
  }
}

export function writeAppMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode === "office" ? "office" : "personal");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("vlue-app-mode-changed", { detail: { mode: readAppMode() } }));
}

export function readActiveOfficeCardId() {
  try {
    return localStorage.getItem(CARD_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function writeActiveOfficeCardId(id) {
  try {
    if (id) localStorage.setItem(CARD_KEY, String(id));
    else localStorage.removeItem(CARD_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("vlue-office-card-changed", { detail: { cardId: readActiveOfficeCardId() } }));
}

/** §8 — 권한 회수 시 강제 개인모드 */
export function forcePersonalMode(reason = "") {
  writeAppMode("personal");
  writeActiveOfficeCardId("");
  window.dispatchEvent(new CustomEvent("vlue-card-access-revoked", { detail: { reason } }));
}
