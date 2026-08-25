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
    body: `[위험] 부모님이 정부기관(${agency})과 통화 중입니다! 보이스피싱 사기 유도가 의심되니 즉시 확인하세요.`,
    data: { kind: "elder_government_call", agency }
  };
}

export function fcmMessageElderLongCall(minutes: number) {
  const min = Math.max(1, Math.floor(minutes));
  return {
    title: "[주의] 가족 보호",
    body: `[주의] 부모님이 저장되지 않은 모르는 번호(내선·대표·휴대폰 등)와 ${min}분 이상 장시간 통화 중입니다. 확인이 필요합니다.`,
    data: { kind: "elder_long_call_unknown", minutes: min }
  };
}

export function fcmMessageElderRemoteApp(appName: string) {
  const app = appName?.trim() || "원격제어 앱";
  return {
    title: "[긴급 위험] 가족 보호",
    body: `[긴급 위험] 부모님 폰에 원격제어 앱(${app})이 실행되었습니다! 자금 탈취 위험이 있으니 즉시 조치하세요.`,
    data: { kind: "elder_remote_control_app", appName: app }
  };
}

export function fcmMessageChildBankThreshold(amountKrw: number) {
  const amt = Math.abs(Math.floor(amountKrw)).toLocaleString("ko-KR");
  return {
    title: "[주의] 가족 보호",
    body: `[주의] 자녀 계좌에서 ${amt}원의 이체 거래가 발생했습니다. (설정 금액 이상)`,
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
