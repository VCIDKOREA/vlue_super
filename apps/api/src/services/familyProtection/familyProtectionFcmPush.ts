import { sendFamilyProtectionPush } from "../fcmNotificationService.js";

/** FCM 실패가 DB·SSE 알림 롤백으로 이어지지 않도록 보호자별 격리 */
export async function pushFamilyProtectionFcmToGuardians(
  guardianUserIds: string[],
  title: string,
  body: string,
  dataPayload?: Record<string, unknown>
): Promise<void> {
  const unique = [...new Set(guardianUserIds.filter(Boolean))];
  for (const guardianUserId of unique) {
    try {
      await sendFamilyProtectionPush(guardianUserId, title, body, dataPayload);
    } catch (err) {
      console.warn("[family-fcm] guardian_push_failed", { guardianUserId, err });
    }
  }
}

export function fcmMessageElderGovernmentCall(agencyLabel: string) {
  const agency = agencyLabel?.trim() || "정부기관";
  return {
    title: "[위험] 가족 보호",
    body: `부모님이 정부기관(${agency})과 통화 중.\n보이스피싱 의심 — 즉시 확인하세요.`,
    data: { kind: "elder_government_call", agency }
  };
}

export function fcmMessageElderLongCall(minutes: number, phoneKindLabel?: string) {
  const min = Math.max(1, Math.floor(minutes));
  const kind = String(phoneKindLabel || "").trim() || "내선·대표·휴대폰";
  return {
    title: "[주의] 가족 보호",
    body: `저장되지 않은 모르는 번호(${kind})와 ${min}분 이상 통화 중.\n지금 확인해 주세요.`,
    data: { kind: "elder_long_call_unknown", minutes: min, phoneKindLabel: kind }
  };
}

export function fcmMessageElderRemoteApp(appName: string) {
  const app = appName?.trim() || "원격제어 앱";
  return {
    title: "[긴급 위험] 가족 보호",
    body: `부모님 폰에 원격제어 앱(${app}) 실행 감지.\n자금 탈취 위험 — 즉시 조치하세요.`,
    data: { kind: "elder_remote_control_app", appName: app }
  };
}

/** 원격 보안 1차 — 가족 전원(본인 제외) */
export function fcmMessageRemoteSecurityStage1(memberName: string) {
  const who = memberName?.trim() || "가족";
  return {
    title: "🚨 [VLUÉ 긴급] 원격 제어 감지",
    body: `${who} 님의 기기에서 원격 제어 앱이 감지되어 작동 중입니다! 즉시 전화로 확인해 주세요. (피싱범의 전화 차단으로 통화 연결이 안 될 수 있으니 빠른 조치가 필요합니다.)`,
    data: {
      kind: "remote_security_stage1",
      stage: "1",
      mode: "family",
      openLocation: "1",
      lastKnownLocation: "1"
    }
  };
}

/** 원격 활성 중 강제 종료 */
export function fcmMessageRemoteForceQuit(memberName: string, appName?: string) {
  const who = memberName?.trim() || "가족";
  const app = appName?.trim() || "원격 앱";
  return {
    title: "🚨 [VLUÉ 긴급] 앱 강제 종료",
    body: `${who} 님의 기기에서 (${app}) VLUÉ 앱이 강제 종료되었습니다. 확인이 필요합니다.`,
    data: {
      kind: "remote_security_force_quit",
      stage: "2",
      mode: "family",
      openLocation: "1",
      lastKnownLocation: "1",
      appName: app
    }
  };
}

/** 원격 활성 중/후 삭제 */
export function fcmMessageRemoteSessionDeleted(memberName: string, appName?: string) {
  const who = memberName?.trim() || "가족";
  const app = appName?.trim() || "원격 앱";
  return {
    title: "🚨 [VLUÉ 긴급] 앱 삭제 감지",
    body: `${who} 님의 기기에서 (${app}) VLUÉ 앱이 삭제되었습니다. 확인이 필요합니다.`,
    data: {
      kind: "remote_security_remote_deleted",
      stage: "2",
      mode: "family",
      openLocation: "1",
      lastKnownLocation: "1",
      appName: app
    }
  };
}

/** 일반 직접 삭제 (원격 비활성) */
export function fcmMessageRemoteNormalDeleted(memberName: string) {
  const who = memberName?.trim() || "가족";
  return {
    title: "[VLUÉ] 앱 삭제 알림",
    body: `${who} 님의 기기에서 VLUÉ 앱이 삭제되었습니다.`,
    data: {
      kind: "remote_security_normal_deleted",
      stage: "2",
      mode: "family",
      openLocation: "1",
      lastKnownLocation: "1"
    }
  };
}

export function fcmMessageChildBankThreshold(amountKrw: number) {
  const amt = Math.abs(Math.floor(amountKrw)).toLocaleString("ko-KR");
  return {
    title: "[주의] 가족 보호",
    body: `자녀 계좌에서 ${amt}원 이체 발생.\n설정 금액 이상 — 확인해 주세요.`,
    data: { kind: "child_bank_transaction", amountKrw: Math.abs(Math.floor(amountKrw)) }
  };
}

export function fcmMessageChildBankUnknownPayee(counterpartyName: string) {
  const who = counterpartyName?.trim() || "미등록 상대";
  return {
    title: "[경고] 가족 보호",
    body: `[경고] 자녀 계좌가 연락처에 없는 미등록 상대방(${who})과 돈을 주고받았습니다. 학폭 갈취 및 유해 사이트 이용 여부를 확인하세요.`,
    data: { kind: "child_bank_transaction", isUnknownPayee: true, counterpartyName: who }
  };
}
