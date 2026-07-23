import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { getPortoneV2Payment } from "../../integrations/portone/portoneV2Client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";

export type CompletePortoneV2PaymentInput = {
  userId: string;
  paymentId: string;
  /** 클라이언트가 의도한 금액 — 위변조 방지용 (필수 권장) */
  expectedAmount?: number;
  orderName?: string;
  customData?: unknown;
};

export type CompletePortoneV2PaymentResult = {
  paymentId: string;
  status: string;
  amountTotal: number;
  orderName: string | null;
  pgProvider: string | null;
  channelKey: string | null;
  paidAt: string | null;
  alreadyPaid: boolean;
  notified: boolean;
};

function formatAmountKrw(n: number): string {
  return `${Math.max(0, Math.floor(n)).toLocaleString("ko-KR")}원`;
}

/**
 * 브라우저 결제창 성공 후 서버에서 단건 조회 → 금액·상태 검증 → DB 저장 → 알림/푸시.
 * PAID / VIRTUAL_ACCOUNT_ISSUED 만 성공으로 간주.
 */
export async function completePortoneV2Payment(
  input: CompletePortoneV2PaymentInput
): Promise<CompletePortoneV2PaymentResult> {
  const paymentId = String(input.paymentId || "").trim();
  if (!paymentId) throw new Error("paymentId가 필요합니다.");
  if (!input.userId) throw new Error("userId가 필요합니다.");

  const payment = await getPortoneV2Payment(paymentId);
  const amountTotal = Math.floor(Number(payment.amount?.total ?? NaN));
  const status = String(payment.status || "");

  const expected = input.expectedAmount != null ? Math.floor(Number(input.expectedAmount)) : null;
  if (expected != null && Number.isFinite(expected) && expected > 0) {
    if (!Number.isFinite(amountTotal) || amountTotal !== expected) {
      throw new Error(
        `결제 금액 불일치 (expected=${expected}, paid=${amountTotal}). 위변조가 의심됩니다.`
      );
    }
  }

  if (status !== "PAID" && status !== "VIRTUAL_ACCOUNT_ISSUED") {
    throw new Error(`결제가 완료되지 않았습니다. status=${status || "UNKNOWN"}`);
  }

  const orderName = payment.orderName || input.orderName || "VLUE 결제";
  const paidAtIso = payment.paidAt || new Date().toISOString();
  const safeAmount = Number.isFinite(amountTotal) ? amountTotal : 0;
  const customerUid = `user_v2_${String(input.userId).replace(/-/g, "").slice(0, 40)}`;

  const existing = await prisma.subscriptionPayment.findUnique({
    where: { merchantUid: paymentId },
    select: { id: true, status: true, userId: true }
  });

  const alreadyPaid = existing?.status === "paid";
  if (existing && existing.userId !== input.userId) {
    throw new Error("이미 다른 계정에 등록된 결제 건입니다.");
  }

  if (!alreadyPaid) {
    await prisma.subscriptionPayment.upsert({
      where: { merchantUid: paymentId },
      create: {
        userId: input.userId,
        merchantUid: paymentId,
        impUid: paymentId,
        customerUid,
        amountKrw: safeAmount,
        status: status === "PAID" ? "paid" : "pending",
        portoneStatus: status,
        paidAt: status === "PAID" ? new Date(paidAtIso) : null,
        rawResponse: payment as Prisma.InputJsonValue
      },
      update: {
        amountKrw: safeAmount,
        status: status === "PAID" ? "paid" : "pending",
        portoneStatus: status,
        paidAt: status === "PAID" ? new Date(paidAtIso) : null,
        rawResponse: payment as Prisma.InputJsonValue,
        impUid: paymentId
      }
    });
  }

  let notified = false;
  if (status === "PAID" && !alreadyPaid) {
    const title = "결제 완료";
    const body = `${orderName} · ${formatAmountKrw(safeAmount)} 결제가 완료되었습니다.`;

    try {
      await prisma.ownerNotification.create({
        data: {
          ownerUserId: input.userId,
          title: title.slice(0, 120),
          body
        }
      });
    } catch (e) {
      console.warn("[portone-v2 notify] ownerNotification", e);
    }

    try {
      ssePublish(input.userId, {
        type: "vlue-payment-receipt",
        title,
        body,
        paymentId,
        amountTotal: safeAmount,
        orderName,
        at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("[portone-v2 notify] sse", e);
    }

    try {
      await sendOfficePushToUser(input.userId, title, body, {
        type: "vlue-payment-receipt",
        paymentId,
        amountTotal: String(safeAmount),
        orderName: String(orderName)
      });
      notified = true;
    } catch (e) {
      console.warn("[portone-v2 notify] fcm", e);
    }
  }

  console.info("[portone-v2 complete]", {
    userId: input.userId,
    paymentId,
    status,
    amountTotal: safeAmount,
    orderName,
    alreadyPaid,
    notified
  });

  return {
    paymentId: String(payment.id || paymentId),
    status,
    amountTotal: safeAmount,
    orderName,
    pgProvider: payment.channel?.pgProvider || null,
    channelKey: payment.channel?.key || null,
    paidAt: payment.paidAt || (status === "PAID" ? paidAtIso : null),
    alreadyPaid,
    notified
  };
}
