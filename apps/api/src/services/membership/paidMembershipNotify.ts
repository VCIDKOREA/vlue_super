import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendAdminBroadcastPushToUser } from "../fcmNotificationService.js";

export type PaidMembershipNotifySource = "payment" | "admin_tester" | "other";

/**
 * 유료 회원 적용 시 기본알림(인박스) + 푸시 자동 전송
 */
export async function notifyPaidMembershipApplied(opts: {
  userId: string;
  source?: PaidMembershipNotifySource;
  months?: number | null;
}) {
  const userId = String(opts.userId || "").trim();
  if (!userId) return { ok: false as const, error: "no_user" };

  const months =
    Number.isFinite(Number(opts.months)) && Number(opts.months) > 0
      ? Math.floor(Number(opts.months))
      : null;
  const monthsLabel = months ? ` (${months}개월)` : "";

  const title = "유료 회원 적용";
  const body =
    opts.source === "admin_tester"
      ? `유료 회원으로 적용되었습니다${monthsLabel}. VLUE 유료 혜택을 바로 이용해 주세요.`
      : `유료 결제가 완료되어 유료 회원으로 적용되었습니다${monthsLabel}. VLUE 유료 혜택을 바로 이용해 주세요.`;

  const payload = {
    type: "vlue-paid-membership",
    category: "멤버십",
    source: opts.source || "other",
    ...(months ? { months } : {}),
    title,
    body
  };

  let notificationId: string | null = null;
  try {
    const row = await prisma.ownerNotification.create({
      data: {
        ownerUserId: userId,
        title: title.slice(0, 120),
        body: body.slice(0, 4000),
        payloadJson: payload
      }
    });
    notificationId = row.id;
  } catch (e) {
    console.warn("[paid-membership-notify] inbox", userId, e);
  }

  try {
    ssePublish(userId, {
      ...payload,
      notificationId,
      at: new Date().toISOString()
    });
  } catch (e) {
    console.warn("[paid-membership-notify] sse", userId, e);
  }

  try {
    await sendAdminBroadcastPushToUser(userId, title, body.slice(0, 180), {
      type: "vlue-paid-membership",
      category: "멤버십",
      source: String(opts.source || "other"),
      ...(notificationId ? { notificationId } : {}),
      ...(months ? { months: String(months) } : {})
    });
  } catch (e) {
    console.warn("[paid-membership-notify] fcm", userId, e);
  }

  return { ok: true as const, notificationId };
}
