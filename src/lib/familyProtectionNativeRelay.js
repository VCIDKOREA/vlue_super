/**
 * Android 네이티브 VlueFamilyBridge — API는 familyProtectionCallBridge / deviceBridge 가 처리.
 * 이 모듈은 네이티브 준비 플래그만 설정합니다.
 */
export function registerFamilyNativeRelay() {
  if (typeof window === "undefined") return;
  if (!window.VlueFamilyBridge) window.VlueFamilyBridge = {};
  window.VlueFamilyBridge.__androidShell = true;
}
