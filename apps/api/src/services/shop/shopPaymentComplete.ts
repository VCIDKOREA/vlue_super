import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { getIamportAccessToken } from "../../integrations/portone/iamportCert.js";
import { getIamportPayment } from "../../integrations/portone/iamportBilling.js";
import { SHOP_ORDER_MERCHANT_PREFIX } from "./shopOrderPrepare.js";
import { settleShopCommerceVluerCommission } from "./shopCommerceVluerSettlement.js";

const DEV_SHOP_PREFIX = "dev_shop_";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} 환경변수가 필요합니다.`);
  return v;
}

export function isDevShopImpUid(impUid: string): boolean {
  return impUid.startsWith(DEV_SHOP_PREFIX);
}

export function allowDevShopPayment(): boolean {
  return (
    process.env.VLUE_ALLOW_DEV_SHOP === "1" ||
    (process.env.NODE_ENV !== "production" && process.env.VLUE_ALLOW_DEV_BILLING === "1")
  );
}

type PortonePaySnapshot = {
  imp_uid: string;
  merchant_uid: string;
  amount: number;
  status: string;
  pay_method?: string;
  receipt_url?: string;
  fail_reason?: string;
  [key: string]: unknown;
};

export async function markShopOrderPaid(
  orderId: string,
  snapshot: PortonePaySnapshot,
  source: "complete_api" | "webhook"
) {
  const paidAt = new Date();
  const impUid = String(snapshot.imp_uid || "");
  const portoneStatus = String(snapshot.status || "paid");
  const receiptUrl = snapshot.receipt_url ? String(snapshot.receipt_url) : null;

  return prisma.$transaction(async (tx) => {
    const order = await tx.shopOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("주문을 찾을 수 없습니다.");
    if (order.status === "paid") {
      return { order, alreadyPaid: true };
    }

    const updated = await tx.shopOrder.update({
      where: { id: orderId },
      data: {
        status: "paid",
        impUid: impUid || order.impUid,
        portoneStatus,
        receiptUrl,
        paidAt,
        payMethod: snapshot.pay_method ? String(snapshot.pay_method) : order.payMethod,
        rawResponse: {
          source,
          portone: snapshot as Prisma.InputJsonValue
        }
      }
    });

    if (updated.storeProductId) {
      const product = await tx.storeProduct.findUnique({ where: { id: updated.storeProductId } });
      if (product && product.stock > 0) {
        await tx.storeProduct.update({
          where: { id: product.id },
          data: { stock: Math.max(0, product.stock - updated.quantity) }
        });
      }
    }

    if (updated.paidByEnterpriseWallet && updated.enterpriseGroupId) {
      const ent = await tx.b2BEnterpriseAccount.findFirst({
        where: { adminUserId: updated.enterpriseGroupId }
      });
      if (ent) {
        await tx.b2BEnterpriseAccount.update({
          where: { id: ent.id },
          data: {
            corporateWalletBalanceKrw: Math.max(0, ent.corporateWalletBalanceKrw - updated.totalAmountKrw)
          }
        });
      }
    }

    return { order: updated, alreadyPaid: false };
  });
}

async function afterShopOrderPaid(order: {
  id: string;
  merchantUid: string;
  buyerUserId: string;
  totalAmountKrw: number;
}) {
  try {
    await settleShopCommerceVluerCommission(order);
  } catch (e) {
    console.warn("[shop-commerce-vluer]", order.merchantUid, e);
  }
}

async function fetchPortonePaymentSnapshot(impUid: string): Promise<PortonePaySnapshot> {
  const impKey = requireEnv("PORTONE_API_KEY");
  const impSecret = requireEnv("PORTONE_API_SECRET");
  const token = await getIamportAccessToken(impKey, impSecret);
  const pay = await getIamportPayment(impUid, token);
  return {
    imp_uid: String(pay.imp_uid || impUid),
    merchant_uid: String(pay.merchant_uid || ""),
    amount: Math.floor(Number(pay.amount) || 0),
    status: String(pay.status || ""),
    pay_method: pay.pay_method ? String(pay.pay_method) : undefined,
    receipt_url: pay.receipt_url ? String(pay.receipt_url) : undefined,
    fail_reason: pay.fail_reason ? String(pay.fail_reason) : undefined
  };
}

export type CompleteShopPaymentInput = {
  buyerUserId: string;
  impUid: string;
  merchantUid: string;
  devShopBypass?: boolean;
};

export async function completeShopPayment(input: CompleteShopPaymentInput) {
  const impUid = String(input.impUid || "").trim();
  const merchantUid = String(input.merchantUid || "").trim();

  if (!impUid || !merchantUid) {
    throw new Error("imp_uid 와 merchant_uid 가 필요합니다.");
  }
  if (!merchantUid.startsWith(SHOP_ORDER_MERCHANT_PREFIX)) {
    throw new Error("상점 주문 merchant_uid 가 아닙니다.");
  }

  const order = await prisma.shopOrder.findUnique({ where: { merchantUid } });
  if (!order) {
    throw new Error("주문을 찾을 수 없습니다. 결제 전 주문 준비를 먼저 진행해 주세요.");
  }
  if (order.buyerUserId !== input.buyerUserId) {
    throw new Error("주문 구매자와 로그인 사용자가 일치하지 않습니다.");
  }
  if (order.status === "paid") {
    return {
      orderId: order.id,
      status: "paid" as const,
      alreadyPaid: true,
      amountKrw: order.totalAmountKrw,
      impUid: order.impUid
    };
  }

  let snapshot: PortonePaySnapshot;

  if (input.devShopBypass || (allowDevShopPayment() && isDevShopImpUid(impUid))) {
    snapshot = {
      imp_uid: impUid,
      merchant_uid: merchantUid,
      amount: order.totalAmountKrw,
      status: "paid",
      pay_method: order.payMethod || "card",
      devBypass: true
    };
  } else {
    snapshot = await fetchPortonePaymentSnapshot(impUid);
    if (snapshot.merchant_uid && snapshot.merchant_uid !== merchantUid) {
      throw new Error("merchant_uid 가 주문과 일치하지 않습니다.");
    }
    if (snapshot.status !== "paid") {
      throw new Error(snapshot.fail_reason || `결제 상태: ${snapshot.status || "unknown"}`);
    }
    if (snapshot.amount !== order.totalAmountKrw) {
      throw new Error(
        `결제 금액(${snapshot.amount}원)이 주문 금액(${order.totalAmountKrw}원)과 일치하지 않습니다.`
      );
    }
  }

  const { order: paid, alreadyPaid } = await markShopOrderPaid(order.id, snapshot, "complete_api");
  if (!alreadyPaid) {
    await afterShopOrderPaid({
      id: paid.id,
      merchantUid: paid.merchantUid,
      buyerUserId: paid.buyerUserId,
      totalAmountKrw: paid.totalAmountKrw
    });
  }

  return {
    orderId: paid.id,
    status: "paid" as const,
    alreadyPaid,
    amountKrw: paid.totalAmountKrw,
    impUid: paid.impUid,
    receiptUrl: paid.receiptUrl
  };
}

/** 웹훅·가상계좌 입금 등 — merchant_uid 기준 멱등 정산 */
export async function finalizeShopOrderFromPortoneWebhook(merchantUid: string, impUid: string) {
  if (!merchantUid.startsWith(SHOP_ORDER_MERCHANT_PREFIX)) {
    return { handled: false as const };
  }

  const order = await prisma.shopOrder.findUnique({ where: { merchantUid } });
  if (!order) {
    return { handled: true as const, ok: false, reason: "order_not_found" };
  }
  if (order.status === "paid") {
    return { handled: true as const, ok: true, alreadyPaid: true, orderId: order.id };
  }

  const snapshot = await fetchPortonePaymentSnapshot(impUid);
  if (snapshot.merchant_uid && snapshot.merchant_uid !== merchantUid) {
    return { handled: true as const, ok: false, reason: "merchant_mismatch" };
  }
  if (snapshot.status !== "paid") {
    return { handled: true as const, ok: false, reason: `status_${snapshot.status}` };
  }
  if (snapshot.amount !== order.totalAmountKrw) {
    return { handled: true as const, ok: false, reason: "amount_mismatch" };
  }

  const { order: paid, alreadyPaid } = await markShopOrderPaid(order.id, snapshot, "webhook");
  if (!alreadyPaid) {
    await afterShopOrderPaid({
      id: paid.id,
      merchantUid: paid.merchantUid,
      buyerUserId: paid.buyerUserId,
      totalAmountKrw: paid.totalAmountKrw
    });
  }
  return { handled: true as const, ok: true, alreadyPaid, orderId: paid.id };
}
