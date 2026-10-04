/**
 * Android/iOS — 설치된 원격제어 앱 보고
 * window.VlueFamilyBridge.onRemoteAppDetected?.("com.teamviewer.host")
 */
import { postWardRemoteApp, postRemoteSecurityDetected } from "./familyProtectionApi.js";
import { reportFamilyCrossThreat, syncFamilySecurityState } from "./familyCrossSecurityApi.js";
import { getDevicePlatformForSync, isIosShell } from "./familyPlatformCapabilities.js";
import { rememberDccSecurityPackage } from "./dccSecurityAttestation.js";

function syncPlatformState(extra = {}) {
  const devicePlatform = getDevicePlatformForSync();
  if (!devicePlatform) return;
  syncFamilySecurityState({ devicePlatform, ...extra }).catch(() => {});
}

function emitDetectedPackage(kind, packageOrLabel, extra = {}) {
  const pkg = String(packageOrLabel || "").trim();
  if (!pkg) return;
  rememberDccSecurityPackage(pkg);
  try {
    window.dispatchEvent(
      new CustomEvent(kind, { detail: { packageName: pkg, pkg, ...extra } })
    );
  } catch {
    /* ignore */
  }
}

export function registerFamilyDeviceBridge() {
  if (typeof window === "undefined") return;

  const prev = window.VlueFamilyBridge || {};
  window.VlueFamilyBridge = {
    ...prev,
    platform: prev.platform || (isIosShell() ? "ios" : prev.platform),
    onRemoteAppDetected: (packageOrLabel) => {
      if (!packageOrLabel) return;
      const pkg = String(packageOrLabel);
      emitDetectedPackage("vlue-remote-app-detected", pkg);
      // 통합 보안 경로 (1차 가족 푸시 + is_remote_active). 본인 단말 UI 알림은 네이티브가 묵음 처리.
      postRemoteSecurityDetected({
        packageName: pkg,
        packageId: pkg,
        is_remote_active: true
      }).catch(() => {
        postWardRemoteApp(pkg).catch(() => {});
      });
      reportFamilyCrossThreat({
        threatKind: "remote_control_app",
        packageName: pkg,
        appLabel: pkg
      }).catch(() => {});
    },
    onDangerousAppDetected: (hit) => {
      if (!hit?.packageName) return;
      emitDetectedPackage("vlue-dangerous-app-detected", hit.packageName, {
        appLabel: hit.appLabel,
        threatKind: hit.threatKind
      });
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
