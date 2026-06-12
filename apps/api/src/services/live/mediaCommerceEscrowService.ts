import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { getIamportAccessToken } from "../../integrations/portone/iamportCert.js";
import { getIamportPayment } from "../../integrations/portone/iamportBilling.js";

export const MEDIA_ESCROW_MERCHANT_PREFIX = "media_escrow_";

export function buildMediaEscrowMerchantUid() {
  return `${MEDIA_ESCROW_MERCHANT_PREFIX}${Date.now()}`;
}

/** 라이브/VOD 인앱 결제 준비 — Iamport 팝업용 merchant_uid 발급 */
export async function prepareMediaCommerceEscrow(input: {
  buyerUserId: string;
  sellerUserId: string;
  feedId: string;
  campaignId?: string | null;
  productTitle: string;
  amountKrw: number;
  merchantUid?: string | null;
}) {
  const amountKrw = Math.max(0, Math.floor(Number(input.amountKrw) || 0));
  if (amountKrw < 100) throw new Error("결제 금액이 올바르지 않습니다.");

  let merchantUid = String(input.merchantUid || "").trim();
  if (merchantUid && !merchantUid.startsWith(MEDIA_ESCROW_MERCHANT_PREFIX)) {
    throw new Error("merchant_uid 형식이 올바르지 않습니다.");
  }
  if (!merchantUid) merchantUid = buildMediaEscrowMerchantUid();

  const existing = await prisma.mediaCommerceEscrow.findUnique({ where: { merchantUid } });
  if (existing?.paymentStatus === "ESCROW_HOLD") {
    throw new Error("이미 결제된 주문입니다.");
  }

  const row = existing
    ? await prisma.mediaCommerceEscrow.update({
        where: { id: existing.id },
        data: {
          buyerUserId: input.buyerUserId,
          sellerUserId: input.sellerUserId,
          feedId: String(input.feedId).slice(0, 120),
          campaignId: input.campaignId ? String(input.campaignId).slice(0, 120) : null,
          productTitle: String(input.productTitle || "라이브 특가").slice(0, 200),
          amountKrw,
          paymentStatus: "pending_payment"
        }
      })
    : await prisma.mediaCommerceEscrow.create({
        data: {
          merchantUid,
          buyerUserId: input.buyerUserId,
          sellerUserId: input.sellerUserId,
          feedId: String(input.feedId).slice(0, 120),
          campaignId: input.campaignId ? String(input.campaignId).slice(0, 120) : null,
          productTitle: String(input.productTitle || "라이브 특가").slice(0, 200),
          amountKrw,
          paymentStatus: "pending_payment"
        }
      });

  return {
    escrowId: row.id,
    merchantUid: row.merchantUid,
    amount: row.amountKrw,
    productTitle: row.productTitle,
    paymentStatus: row.paymentStatus
  };
}

/** Iamport 결제 완료 → payment_status: ESCROW_HOLD (플랫폼 에스크로 예치) */
export async function completeMediaCommerceEscrow(input: {
  merchantUid: string;
  impUid: string;
  buyerUserId: string;
}) {
  const merchantUid = String(input.merchantUid || "").trim();
  const impUid = String(input.impUid || "").trim();
  if (!merchantUid || !impUid) throw new Error("merchant_uid와 imp_uid가 필요합니다.");

  const escrow = await prisma.mediaCommerceEscrow.findUnique({ where: { merchantUid } });
  if (!escrow) throw new Error("에스크로 주문을 찾을 수 없습니다.");
  if (escrow.buyerUserId !== input.buyerUserId) throw new Error("구매자가 일치하지 않습니다.");
  if (escrow.paymentStatus === "ESCROW_HOLD") {
    return { escrow, alreadyPaid: true };
  }

  const impKey = process.env.PORTONE_API_KEY?.trim();
  const impSecret = process.env.PORTONE_API_SECRET?.trim();
  if (!impKey || !impSecret) throw new Error("PORTONE_API_KEY/PORTONE_API_SECRET 환경변수가 필요합니다.");
  const token = await getIamportAccessToken(impKey, impSecret);
  const payment = await getIamportPayment(impUid, token);
  if (String(payment.status) !== "paid") {
    throw new Error(payment.fail_reason ? String(payment.fail_reason) : "결제가 완료되지 않았습니다.");
  }
  if (Math.floor(Number(payment.amount) || 0) !== escrow.amountKrw) {
    throw new Error("결제 금액이 주문과 일치하지 않습니다.");
  }

  const updated = await prisma.mediaCommerceEscrow.update({
    where: { id: escrow.id },
    data: {
      impUid,
      paymentStatus: "ESCROW_HOLD",
      receiptUrl: payment.receipt_url ? String(payment.receipt_url) : null,
      paidAt: new Date(),
      rawResponse: { portone: payment as Prisma.InputJsonValue, escrow: true }
    }
  });

  return { escrow: updated, alreadyPaid: false };
}

export async function getMediaEscrowByMerchantUid(merchantUid: string) {
  return prisma.mediaCommerceEscrow.findUnique({ where: { merchantUid } });
}
