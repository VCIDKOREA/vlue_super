import type { CrossSecurityThreatKind } from "./familyCrossSecurityStore.js";

export { pushFamilyProtectionFcmToGuardians } from "./familyProtectionFcmPush.js";

export function fcmMessageFamilyMalwareThreat(
  threatKind: CrossSecurityThreatKind,
  appLabel: string
) {
  const app = appLabel?.trim() || "앱";
  if (threatKind === "vlue_app_uninstalled") {
    return {
      title: "[긴급] VLUE 앱 삭제 감지",
      body: `가족 구성원 기기에서 VLUE 앱이 삭제되었습니다. 즉시 연락해 보호 기능을 복구하세요.`,
      data: { kind: "family_vlue_app_uninstalled", appName: app }
    };
  }
  return {
    title: "[위협] 가족 보안 네트워크",
    body: `가족 기기에서 위험 앱(${app})이 탐지되었습니다. [즉시 제거]로 조치하세요.`,
    data: { kind: "family_dangerous_permission_app", appName: app }
  };
}
