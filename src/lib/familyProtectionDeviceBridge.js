/**
 * Android/iOS — 설치된 원격제어 앱 보고
 * window.VlueFamilyBridge.onRemoteAppDetected?.("com.teamviewer.host")
 */
import { postWardRemoteApp } from "./familyProtectionApi.js";

export function registerFamilyDeviceBridge() {
  if (typeof window === "undefined") return;

  const prev = window.VlueFamilyBridge || {};
  window.VlueFamilyBridge = {
    ...prev,
    onRemoteAppDetected: (packageOrLabel) => {
      if (!packageOrLabel) return;
      postWardRemoteApp(String(packageOrLabel)).catch(() => {});
    }
  };
}
