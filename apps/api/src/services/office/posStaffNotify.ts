import { sendFamilyProtectionPush } from "../fcmNotificationService.js";
import { ssePublish } from "../../realtime/sseHub.js";

const POS_DASHBOARD_DEEP_LINK = "vlue://pos-sales-dashboard";

/** STAFF 마감 빌지 전송 → OWNER 즉시 푸시 + SSE (매출 대시보드 딥링크) */
export async function notifyOwnerStaffBillSubmitted(
  ownerUserId: string,
  staffDisplayName: string,
  entryId: string
) {
  const who = staffDisplayName?.trim() || "직원";
  const title = "[매출] 마감 빌지 도착";
  const body = `직원 ${who}님이 마감 빌지를 전송했습니다.`;

  await sendFamilyProtectionPush(ownerUserId, title, body, {
    kind: "pos_staff_bill_submitted",
    entryId,
    staffName: who,
    deepLink: POS_DASHBOARD_DEEP_LINK,
    action: "open_pos_dashboard"
  });

  ssePublish(ownerUserId, {
    type: "vlue-pos-staff-bill-submitted",
    title,
    body,
    entryId,
    staffName: who,
    deepLink: POS_DASHBOARD_DEEP_LINK,
    action: "open_pos_dashboard",
    at: new Date().toISOString()
  });
}
