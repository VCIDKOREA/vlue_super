import { prisma } from "../../db/client.js";
import {
  canEnterprisePurchase,
  loadEnterpriseUserContext,
  type EnterpriseUserContext
} from "../enterprise/enterpriseContext.js";
import { buildShopMerchantUid, SHOP_ORDER_MERCHANT_PREFIX } from "./shopOrderPrepare.js";
import { resolveStoreUnitPrice } from "./storeProductService.js";

export { buildShopMerchantUid, SHOP_ORDER_MERCHANT_PREFIX };

import type { PaidBillingCycle } from "../membership/membershipBmConstants.js";
import { assertMembershipCheckoutAmountKrw } from "../membership/membershipCheckoutGuard.js";

export { assertMembershipCheckoutAmountKrw };

export async function assertShopPurchaseAllowed(buyerUserId: string) {
  const ctx = await loadEnterpriseUserContext(buyerUserId);
  if (!ctx || ctx.enterpriseRole === "NONE") {
    return { ok: true as const, ctx: null, enterpriseGroupId: null as string | null };
  }
  if (!canEnterprisePurchase(ctx.enterpriseRole)) {
    throw new Error(
      "직원 계정은 직접 결제할 수 없습니다. [구매 요청]으로 경리·대표 계정에 전달해 주세요."
    );
  }
  return {
    ok: true as const,
    ctx,
    enterpriseGroupId: ctx.enterpriseGroupId || ctx.userId
  };
}

export async function prepareShopOrderGuarded(input: {
  buyerUserId: string;
  sellerUserId: string;
  externalProductId: string;
  quantity?: number;
  payMethod?: string | null;
  merchantUid?: string | null;
  useEnterpriseWallet?: boolean;
}) {
  const guard = await assertShopPurchaseAllowed(input.buyerUserId);

  const sellerUserId = String(input.sellerUserId || "").trim();
  const externalProductId = String(input.externalProductId || "").trim();
  const quantity = Math.max(1, Math.min(99, Math.floor(Number(input.quantity) || 1)));

  if (!sellerUserId || !externalProductId) {
    throw new Error("판매자와 상품 id가 필요합니다.");
  }

  const product = await prisma.storeProduct.findUnique({
    where: {
      sellerUserId_externalId: { sellerUserId, externalId: externalProductId }
    }
  });
  if (!product) throw new Error("서버에 등록된 상품이 없습니다. 상품 저장 후 다시 시도해 주세요.");
  if (product.status !== "on_sale") throw new Error("판매 중인 상품이 아닙니다.");
  if (product.stock < quantity) throw new Error("재고가 부족합니다.");

  const unitPrice = resolveStoreUnitPrice(product);
  const shippingFeeKrw = product.shippingFeeKrw || 0;
  const totalAmountKrw = unitPrice * quantity + shippingFeeKrw;

  if (guard.enterpriseGroupId && input.useEnterpriseWallet) {
    const ent = guard.ctx?.enterpriseId
      ? await prisma.b2BEnterpriseAccount.findUnique({ where: { id: guard.ctx.enterpriseId } })
      : null;
    if (!ent) throw new Error("기업 예산 정보를 찾을 수 없습니다.");
    if (ent.corporateWalletBalanceKrw < totalAmountKrw) {
      throw new Error("회사 공용 예산(캐시)이 부족합니다. 대표·경리 계정에서 충전해 주세요.");
    }
  }

  let merchantUid = String(input.merchantUid || "").trim();
  if (merchantUid && !merchantUid.startsWith(SHOP_ORDER_MERCHANT_PREFIX)) {
    throw new Error("merchant_uid 형식이 올바르지 않습니다.");
  }
  if (!merchantUid) merchantUid = buildShopMerchantUid();

  const existing = await prisma.shopOrder.findUnique({ where: { merchantUid } });
  if (existing?.status === "paid") throw new Error("이미 결제된 주문입니다.");

  const payMethod = input.payMethod ? String(input.payMethod).trim() : null;
  const enterpriseGroupId = guard.enterpriseGroupId;

  const order = existing
    ? await prisma.shopOrder.update({
        where: { id: existing.id },
        data: {
          buyerUserId: input.buyerUserId,
          storeProductId: product.id,
          productName: product.name,
          unitPriceKrw: unitPrice,
          shippingFeeKrw,
          quantity,
          totalAmountKrw,
          payMethod,
          enterpriseGroupId,
          paidByEnterpriseWallet: Boolean(input.useEnterpriseWallet && enterpriseGroupId),
          status: "pending_payment"
        }
      })
    : await prisma.shopOrder.create({
        data: {
          merchantUid,
          buyerUserId: input.buyerUserId,
          sellerUserId,
          storeProductId: product.id,
          productName: product.name,
          unitPriceKrw: unitPrice,
          shippingFeeKrw,
          quantity,
          totalAmountKrw,
          payMethod,
          enterpriseGroupId,
          paidByEnterpriseWallet: Boolean(input.useEnterpriseWallet && enterpriseGroupId),
          status: "pending_payment"
        }
      });

  return {
    orderId: order.id,
    merchantUid: order.merchantUid,
    amount: order.totalAmountKrw,
    productName: order.productName,
    payMethod: order.payMethod,
    enterpriseGroupId
  };
}

export async function createStorePurchaseRequest(input: {
  requesterUserId: string;
  productId: string;
  productName: string;
  quantity?: number;
  unitPriceKrw?: number;
}) {
  const ctx = await loadEnterpriseUserContext(input.requesterUserId);
  if (!ctx || ctx.enterpriseRole === "NONE" || !ctx.enterpriseGroupId || !ctx.enterpriseId) {
    throw new Error("기업 단체 소속 직원만 구매 요청할 수 있습니다.");
  }
  if (canEnterprisePurchase(ctx.enterpriseRole)) {
    throw new Error("구매 권한 계정은 직접 결제하세요.");
  }

  const user = await prisma.user.findUnique({
    where: { id: input.requesterUserId },
    select: { legalName: true, publicHandle: true }
  });

  const qty = Math.max(1, Math.min(99, Math.floor(Number(input.quantity) || 1)));

  return prisma.storePurchaseRequest.create({
    data: {
      enterpriseId: ctx.enterpriseId,
      enterpriseGroupId: ctx.enterpriseGroupId,
      productId: String(input.productId),
      productName: String(input.productName).slice(0, 200),
      quantity: qty,
      unitPriceKrw: Math.max(0, Math.floor(Number(input.unitPriceKrw) || 0)),
      requestedByUserId: input.requesterUserId,
      requestedByName: user?.legalName || user?.publicHandle || "직원",
      requestedByDept: ctx.enterpriseDept,
      status: "PENDING"
    }
  });
}

export async function listPurchaseRequestsForEnterprise(viewerUserId: string, status?: string) {
  const ctx = await loadEnterpriseUserContext(viewerUserId);
  if (!ctx?.enterpriseId) throw new Error("기업 소속이 아닙니다.");

  const isBuyerSide = canEnterprisePurchase(ctx.enterpriseRole) || ctx.enterpriseRole === "MASTER";
  const where: { enterpriseId: string; status?: "PENDING" | "APPROVED" | "REJECTED" } = {
    enterpriseId: ctx.enterpriseId
  };
  if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    where.status = status;
  }
  if (!isBuyerSide) {
    return prisma.storePurchaseRequest.findMany({
      where: { ...where, requestedByUserId: viewerUserId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }
  return prisma.storePurchaseRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

export async function reviewPurchaseRequest(
  reviewerUserId: string,
  requestId: string,
  action: "approve" | "reject",
  note?: string
) {
  const ctx = await loadEnterpriseUserContext(reviewerUserId);
  if (!ctx || !canEnterprisePurchase(ctx.enterpriseRole)) {
    throw new Error("구매 요청 승인 권한이 없습니다.");
  }

  const req = await prisma.storePurchaseRequest.findUnique({ where: { id: requestId } });
  if (!req || req.enterpriseId !== ctx.enterpriseId) throw new Error("요청을 찾을 수 없습니다.");

  return prisma.storePurchaseRequest.update({
    where: { id: requestId },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      buyerNote: note?.trim() || null,
      reviewedAt: new Date(),
      reviewedByUserId: reviewerUserId
    }
  });
}

export async function addToEnterpriseProcurementCart(
  userId: string,
  item: { externalProductId: string; productName: string; quantity: number; unitPriceKrw: number }
) {
  const ctx = await loadEnterpriseUserContext(userId);
  if (!ctx?.enterpriseId) throw new Error("기업 소속이 아닙니다.");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, publicHandle: true }
  });

  return prisma.enterpriseProcurementCartItem.create({
    data: {
      enterpriseId: ctx.enterpriseId,
      externalProductId: item.externalProductId,
      productName: item.productName,
      quantity: Math.max(1, item.quantity),
      unitPriceKrw: item.unitPriceKrw,
      addedByUserId: userId,
      addedByName: user?.legalName || user?.publicHandle || "직원",
      addedByDept: ctx.enterpriseDept
    }
  });
}

export async function listEnterpriseProcurementCart(enterpriseId: string) {
  return prisma.enterpriseProcurementCartItem.findMany({
    where: { enterpriseId },
    orderBy: { createdAt: "asc" }
  });
}

export async function getEnterpriseTaxExportRows(enterpriseGroupId: string) {
  return prisma.shopOrder.findMany({
    where: { enterpriseGroupId, status: "paid" },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      merchantUid: true,
      productName: true,
      quantity: true,
      unitPriceKrw: true,
      shippingFeeKrw: true,
      totalAmountKrw: true,
      payMethod: true,
      paidAt: true,
      paidByEnterpriseWallet: true,
      buyer: { select: { legalName: true, publicHandle: true, enterpriseRole: true } }
    }
  });
}
