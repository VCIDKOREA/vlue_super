import { detectDevicePlatform } from "./webauthnBiometric.js";

/** iOS 정책상 Android 전용 기능 시도 시 표시 */
export const IOS_RESTRICTED_MESSAGE = "아이폰(애플iso)은 규정상 해당기능이 제한됩니다.";

const IOS_NOTICE_SESSION_KEY = "vlue_ios_child_notice_shown_v1";

/**
 * 가족보호 플랫폼 기능 매트릭스 (Android vs iOS)
 * @type {Record<string, { label: string, android: boolean | 'strong', ios: boolean | 'strong' | 'limited', note?: string }>}
 */
export const FAMILY_PLATFORM_MATRIX = {
  posOcr: {
    label: "OCR 빌지 스캔",
    android: "strong",
    ios: "strong",
    note: "ML Kit(Android) · Vision(iOS)"
  },
  bankNotification: {
    label: "실시간 입출금 알림",
    android: true,
    ios: false,
    note: "Android NotificationListener · iOS 샌드박스 차단"
  },
  dangerousAppScan: {
    label: "실시간 악성 앱 탐지",
    android: true,
    ios: false,
    note: "Android 패키지·권한 스캔 · iOS 불가"
  },
  familyStateShare: {
    label: "가족 보안/상태 공유",
    android: true,
    ios: "limited",
    note: "iOS 백그라운드·배터리 동기화 제한"
  }
};

/** VLUE 앱 셸 플랫폼 — bridge 우선, 없으면 UA */
export function getVlueShellPlatform() {
  if (typeof window === "undefined") return "unknown";
  const bridge = window.VlueFamilyBridge || {};
  if (bridge.platform === "ios" || bridge.__iosShell) return "ios";
  if (bridge.platform === "android" || bridge.__androidShell) return "android";
  const uaPlat = detectDevicePlatform();
  if (uaPlat === "ios" || uaPlat === "android") return uaPlat;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "unknown";
}

export function isIosShell() {
  return getVlueShellPlatform() === "ios";
}

export function isAndroidShell() {
  return getVlueShellPlatform() === "android";
}

export function isFeatureSupportedOnShell(featureKey) {
  const row = FAMILY_PLATFORM_MATRIX[featureKey];
  if (!row) return true;
  const plat = getVlueShellPlatform();
  if (plat === "ios") return row.ios === true || row.ios === "strong" || row.ios === "limited";
  if (plat === "android") return row.android === true || row.android === "strong";
  return true;
}

/** iOS에서 Android 전용 기능 — 안내창 이벤트 발행 */
export function requestIosRestrictedNotice(featureKey) {
  if (!isIosShell()) return false;
  const row = FAMILY_PLATFORM_MATRIX[featureKey];
  if (!row) return false;
  if (row.ios === true || row.ios === "strong") return false;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("vlue-show-ios-restricted", {
        detail: { feature: featureKey, label: row.label }
      })
    );
  }
  return true;
}

export function getDevicePlatformForSync() {
  const p = getVlueShellPlatform();
  return p === "ios" || p === "android" ? p : undefined;
}

/** 자녀(피보호자)가 iPhone 앱 사용 시 세션당 1회 안내 */
export function promptIosChildWardNoticeOnce() {
  if (!isIosShell()) return;
  try {
    if (sessionStorage.getItem(IOS_NOTICE_SESSION_KEY) === "1") return;
    sessionStorage.setItem(IOS_NOTICE_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("vlue-show-ios-restricted", { detail: { wardChild: true } }));
}

export function matrixStatusLabel(value) {
  if (value === "strong") return "가능 (강력)";
  if (value === "limited") return "제한적";
  if (value === true) return "가능";
  return "불가능";
}
