import { prisma } from "../../db/client.js";

export type StoreProductSyncInput = {
  externalId: string;
  name: string;
  priceKrw: number;
  salePriceKrw?: number | null;
  shippingFeeKrw?: number;
  stock?: number;
  status?: string;
};

export function resolveStoreUnitPrice(product: {
  unitPriceKrw: number;
  salePriceKrw: number | null;
}): number {
  if (product.salePriceKrw != null && product.salePriceKrw >= 0) {
    return product.salePriceKrw;
  }
  return product.unitPriceKrw;
}

export async function syncStoreProduct(sellerUserId: string, input: StoreProductSyncInput) {
  const externalId = String(input.externalId || "").trim();
  const name = String(input.name || "").trim();
  if (!externalId || !name) {
    throw new Error("상품 id와 이름이 필요합니다.");
  }

  const unitPriceKrw = Math.max(0, Math.floor(Number(input.priceKrw) || 0));
  const saleRaw = input.salePriceKrw;
  const salePriceKrw =
    saleRaw == null ? null : Math.max(0, Math.floor(Number(saleRaw) || 0));
  const shippingFeeKrw = Math.max(0, Math.floor(Number(input.shippingFeeKrw) || 0));
  const stock = Math.max(0, Math.floor(Number(input.stock) || 0));
  const status = String(input.status || "on_sale").trim() || "on_sale";

  return prisma.storeProduct.upsert({
    where: {
      sellerUserId_externalId: { sellerUserId, externalId }
    },
    create: {
      sellerUserId,
      externalId,
      name,
      unitPriceKrw,
      salePriceKrw,
      shippingFeeKrw,
      stock,
      status
    },
    update: {
      name,
      unitPriceKrw,
      salePriceKrw,
      shippingFeeKrw,
      stock,
      status
    }
  });
}

export async function listStoreProductsForSeller(
  sellerUserId: string,
  opts?: { status?: string; limit?: number }
) {
  const seller = String(sellerUserId || "").trim();
  if (!seller) throw new Error("판매자 id가 필요합니다.");
  const status = opts?.status ? String(opts.status).trim() : undefined;
  const limit = Math.min(200, Math.max(1, Math.floor(Number(opts?.limit) || 120)));
  return prisma.storeProduct.findMany({
    where: {
      sellerUserId: seller,
      ...(status ? { status } : {})
    },
    orderBy: { updatedAt: "desc" },
    take: limit
  });
}
