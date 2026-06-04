export const LETTERING_ENABLED_KEY = "vlue_lettering_enabled";

export function readLetteringEnabled() {
  try {
    return localStorage.getItem(LETTERING_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLetteringEnabled(enabled) {
  try {
    localStorage.setItem(LETTERING_ENABLED_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent("vlue-lettering-settings-changed", { detail: { enabled } }));
    syncLetteringEnabledToNative(enabled);
  } catch {
    /* ignore */
  }
}

/** Android/iOS 네이티브 SharedPreferences·UserDefaults 동기화 */
export function syncLetteringEnabledToNative(enabled) {
  if (typeof window === "undefined") return;
  const payload = { enabled: Boolean(enabled) };
  try {
    window.VlueLettering?.setLetteringEnabled?.(payload.enabled);
  } catch {
    /* ignore */
  }
  try {
    window.Android?.setLetteringEnabled?.(payload.enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  try {
    window.webkit?.messageHandlers?.vlueLetteringSettings?.postMessage(payload);
  } catch {
    /* ignore */
  }
}

export function requestLetteringPermissions() {
  if (typeof window === "undefined") return { ok: false };
  try {
    if (window.VlueLettering?.requestLetteringPermissions) {
      window.VlueLettering.requestLetteringPermissions();
      return { ok: true, channel: "VlueLettering" };
    }
  } catch {
    /* ignore */
  }
  try {
    if (window.Android?.requestLetteringPermissions) {
      window.Android.requestLetteringPermissions();
      return { ok: true, channel: "Android" };
    }
  } catch {
    /* ignore */
  }
  try {
    window.webkit?.messageHandlers?.vlueLetteringSettings?.postMessage({ action: "requestPermissions" });
    return { ok: true, channel: "webkit" };
  } catch {
    /* ignore */
  }
  return { ok: false, needsNative: true };
}
