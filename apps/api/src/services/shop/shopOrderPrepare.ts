import { prisma } from "../../db/client.js";
import { resolveStoreUnitPrice } from "./storeProductService.js";

export const SHOP_ORDER_MERCHANT_PREFIX = "shop_order_";

export function buildShopMerchantUid(): string {
  return `${SHOP_ORDER_MERCHANT_PREFIX}${Date.now()}`;
}

export async function prepareShopOrder(input: {
  buyerUserId: string;
  sellerUserId: string;
  externalProductId: string;
  quantity?: number;
  payMethod?: string | null;
  merchantUid?: string | null;
}) {
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
  if (!product) {
    throw new Error("서버에 등록된 상품이 없습니다. 상품 저장 후 다시 시도해 주세요.");
  }
  if (product.status !== "on_sale") {
    throw new Error("판매 중인 상품이 아닙니다.");
  }
  if (product.stock < quantity) {
    throw new Error("재고가 부족합니다.");
  }

  const unitPrice = resolveStoreUnitPrice(product);
  const shippingFeeKrw = product.shippingFeeKrw || 0;
  const totalAmountKrw = unitPrice * quantity + shippingFeeKrw;

  let merchantUid = String(input.merchantUid || "").trim();
  if (merchantUid) {
    if (!merchantUid.startsWith(SHOP_ORDER_MERCHANT_PREFIX)) {
      throw new Error("merchant_uid 형식이 올바르지 않습니다.");
    }
  } else {
    merchantUid = buildShopMerchantUid();
  }

  const existing = await prisma.shopOrder.findUnique({ where: { merchantUid } });
  if (existing?.status === "paid") {
    throw new Error("이미 결제된 주문입니다.");
  }

  const payMethod = input.payMethod ? String(input.payMethod).trim() : null;

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
          status: "pending_payment"
        }
      });

  return {
    orderId: order.id,
    merchantUid: order.merchantUid,
    amount: order.totalAmountKrw,
    productName: order.productName,
    payMethod: order.payMethod
  };
}
