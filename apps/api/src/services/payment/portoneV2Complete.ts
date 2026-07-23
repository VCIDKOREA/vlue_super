import { getPortoneV2Payment } from "../../integrations/portone/portoneV2Client.js";

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
};

/**
 * 브라우저 결제창 성공 후 서버에서 단건 조회 → 금액·상태 검증.
 * PAID / VIRTUAL_ACCOUNT_ISSUED 만 성공으로 간주.
 */
export async function completePortoneV2Payment(
  input: CompletePortoneV2PaymentInput
): Promise<CompletePortoneV2PaymentResult> {
  const paymentId = String(input.paymentId || "").trim();
  if (!paymentId) throw new Error("paymentId가 필요합니다.");

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

  // TODO: 상품/멤버십 지급 로직은 customData·orderName 기준으로 여기서 분기하세요.
  // 현재는 검증 통과 결과만 반환합니다.
  console.info("[portone-v2 complete]", {
    userId: input.userId,
    paymentId,
    status,
    amountTotal,
    orderName: payment.orderName || input.orderName || null
  });

  return {
    paymentId: String(payment.id || paymentId),
    status,
    amountTotal: Number.isFinite(amountTotal) ? amountTotal : 0,
    orderName: payment.orderName || input.orderName || null,
    pgProvider: payment.channel?.pgProvider || null,
    channelKey: payment.channel?.key || null,
    paidAt: payment.paidAt || null,
    alreadyPaid: status === "PAID"
  };
}
