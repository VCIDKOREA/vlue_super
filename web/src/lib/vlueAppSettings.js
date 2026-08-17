const STORAGE_KEY = "vlue_app_settings_v1";
const LEGACY_STATUS_PLACEHOLDER = "인증 기반 커뮤니케이션 운영중";

export const DEFAULT_APP_SETTINGS = {
  allowSearchByPhone: false,
  allowSearchByQr: true,
  allowSearchById: true,
  showReadStatus: true,
  showOnlineStatus: true,
  chatNotifications: true,
  messagePreview: true,
  quietMode: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  autoSaveMedia: true,
  familyProtectionAlerts: true,
  chatFontScale: "medium",
  uiFontScale: "medium",
  statusMessage: ""
};

function normalizeStatusMessage(raw) {
  const s = String(raw || "").trim();
  if (!s || s === LEGACY_STATUS_PLACEHOLDER) return "";
  return s;
}

const FONT_SCALE_MAP = { small: "0.92", medium: "1", large: "1.08" };

export function readAppSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_APP_SETTINGS, ...parsed };
    merged.statusMessage = normalizeStatusMessage(merged.statusMessage);
    return merged;
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function writeAppSettings(patch) {
  const next = { ...readAppSettings(), ...patch };
  next.statusMessage = normalizeStatusMessage(next.statusMessage);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new CustomEvent("vlue-app-settings-changed", { detail: next }));
  } catch {
    /* ignore */
  }
  applyAppSettingsToDocument(next);
  return next;
}

export function applyAppSettingsToDocument(settings = readAppSettings()) {
  const root = document.documentElement;
  root.dataset.vlueChatFont = settings.chatFontScale || "medium";
  root.dataset.vlueUiFont = settings.uiFontScale || "medium";
  root.style.setProperty("--vlue-chat-font-scale", FONT_SCALE_MAP[settings.chatFontScale] || "1");
  root.style.setProperty("--vlue-ui-font-scale", FONT_SCALE_MAP[settings.uiFontScale] || "1");
  root.style.removeProperty("--vlue-ui-scale-num");

  const appBody = document.getElementById("app-body");
  if (appBody) {
    appBody.style.removeProperty("transform");
    appBody.style.removeProperty("transform-origin");
    appBody.style.removeProperty("width");
    appBody.style.removeProperty("min-height");
    appBody.style.removeProperty("zoom");
  }
}

export function readStatusMessage() {
  return normalizeStatusMessage(readAppSettings().statusMessage);
}
