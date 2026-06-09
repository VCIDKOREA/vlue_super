/**
 * Android/iOS — 설치된 원격제어 앱 보고
 * window.VlueFamilyBridge.onRemoteAppDetected?.("com.teamviewer.host")
 */
import { postWardRemoteApp } from "./familyProtectionApi.js";
import { reportFamilyCrossThreat, syncFamilySecurityState } from "./familyCrossSecurityApi.js";
import { getDevicePlatformForSync, isIosShell } from "./familyPlatformCapabilities.js";

function syncPlatformState(extra = {}) {
  const devicePlatform = getDevicePlatformForSync();
  if (!devicePlatform) return;
  syncFamilySecurityState({ devicePlatform, ...extra }).catch(() => {});
}

export function registerFamilyDeviceBridge() {
  if (typeof window === "undefined") return;

  const prev = window.VlueFamilyBridge || {};
  window.VlueFamilyBridge = {
    ...prev,
    platform: prev.platform || (isIosShell() ? "ios" : prev.platform),
    onRemoteAppDetected: (packageOrLabel) => {
      if (!packageOrLabel) return;
      postWardRemoteApp(String(packageOrLabel)).catch(() => {});
      reportFamilyCrossThreat({
        threatKind: "remote_control_app",
        packageName: String(packageOrLabel),
        appLabel: String(packageOrLabel)
      }).catch(() => {});
    },
    onDangerousAppDetected: (hit) => {
      if (!hit?.packageName) return;
      reportFamilyCrossThreat({
        threatKind: hit.threatKind || "dangerous_permission_app",
        packageName: hit.packageName,
        appLabel: hit.appLabel || hit.packageName
      }).catch(() => {});
    },
    onBatteryState: (snap) => {
      if (!snap || typeof snap.percent !== "number") return;
      syncPlatformState({
        batteryPercent: snap.percent,
        isCharging: Boolean(snap.isCharging)
      });
    },
    onBankNotification: (evt) => {
      if (!evt?.maskedSummary) return;
      syncFamilySecurityState({
        lastBankActivityMasked: String(evt.maskedSummary)
      }).catch(() => {});
    },
    requestDeletePackage: (packageName) => {
      try {
        window.VlueFamilyBridgeNative?.requestDeletePackage?.(String(packageName || ""));
      } catch {
        /* ignore */
      }
    }
  };

  syncPlatformState();

  try {
    if (!isIosShell()) {
      window.VlueFamilyBridgeNative?.scanDangerousAppsNow?.();
    }
  } catch {
    /* ignore */
  }
}
