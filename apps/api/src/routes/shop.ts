import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { prisma } from "../db/client.js";
import { assertTaxExportAccess, buildTaxExportCsv, buildTaxExportHtml } from "../services/shop/taxExportService.js";
import { prepareShopOrderGuarded, createStorePurchaseRequest, listPurchaseRequestsForEnterprise, reviewPurchaseRequest, addToEnterpriseProcurementCart, getEnterpriseTaxExportRows } from "../services/shop/shopOrderService.js";
import { shareEnterpriseCartToGroupChat, getEnterpriseDashboard } from "../services/shop/cartShareService.js";
import { enforceEnterpriseLineAccess, requireEnterprisePurchaser, requireEnterpriseMember, requireEnterpriseAdmin } from "../middleware/enterpriseAccess.js";
import { loadEnterpriseUserContext } from "../services/enterprise/enterpriseContext.js";
import { listStoreProductsForSeller, syncStoreProduct } from "../services/shop/storeProductService.js";
import { shopPaymentRoutes } from "./shopPayment.js";

export const shopRoutes = new Hono();

shopRoutes.use("*", requireUserHeader, enforceEnterpriseLineAccess);

/** 판매자 상점 상품 목록 (PostgreSQL 단일 소스) */
shopRoutes.get("/products", async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const sellerUserId = String(c.req.query("sellerUserId") || uid).trim();
    const status = c.req.query("status") || undefined;
    const rows = await listStoreProductsForSeller(sellerUserId, { status });
    return c.json({
      ok: true,
      products: rows.map((p) => ({
        serverProductId: p.id,
        externalId: p.externalId,
        sellerUserId: p.sellerUserId,
        name: p.name,
        priceKrw: p.unitPriceKrw,
        salePriceKrw: p.salePriceKrw,
        shippingFeeKrw: p.shippingFeeKrw,
        stock: p.stock,
        status: p.status,
        updatedAt: p.updatedAt.toISOString()
      }))
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "SHOP_PRODUCT_LIST_FAILED" }, 400);
  }
});

/** 판매자 상품 DB 동기화 (localStorage → 서버 가격 검증용) */
shopRoutes.post("/products/sync", async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      externalId?: string;
      name?: string;
      priceKrw?: number;
      salePriceKrw?: number | null;
      shippingFeeKrw?: number;
      stock?: number;
      status?: string;
    }>();

    const product = await syncStoreProduct(uid, {
      externalId: String(body?.externalId || ""),
      name: String(body?.name || ""),
      priceKrw: Number(body?.priceKrw || 0),
      salePriceKrw: body?.salePriceKrw,
      shippingFeeKrw: Number(body?.shippingFeeKrw || 0),
      stock: Number(body?.stock || 0),
      status: body?.status
    });

    return c.json({ ok: true, productId: product.id, externalId: product.externalId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "SHOP_PRODUCT_SYNC_FAILED" }, 400);
  }
});

/** 결제 전 주문 생성 — merchant_uid·금액 확정 */
shopRoutes.post("/orders/prepare", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      sellerUserId?: string;
      externalProductId?: string;
      quantity?: number;
      payMethod?: string;
      merchantUid?: string;
      useEnterpriseWallet?: boolean;
    }>();

    const sellerUserId = String(body?.sellerUserId || uid).trim();
    const prepared = await prepareShopOrderGuarded({
      buyerUserId: uid,
      sellerUserId,
      externalProductId: String(body?.externalProductId || ""),
      quantity: body?.quantity,
      payMethod: body?.payMethod,
      merchantUid: body?.merchantUid,
      useEnterpriseWallet: Boolean(body?.useEnterpriseWallet)
    });

    return c.json({ ok: true, ...prepared });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "SHOP_ORDER_PREPARE_FAILED" }, 400);
  }
});

shopRoutes.route("/payment", shopPaymentRoutes);

/** B2B 사내 비품 — 구매 요청·공용 장바구니·그룹방 공유 */
shopRoutes.get("/enterprise/dashboard", requireUserHeader, requireEnterpriseMember, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const dash = await getEnterpriseDashboard(uid);
    return c.json(dash);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.post("/enterprise/purchase-request", requireUserHeader, requireEnterpriseMember, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      productId?: string;
      productName?: string;
      quantity?: number;
      unitPriceKrw?: number;
    }>();
    const req = await createStorePurchaseRequest({
      requesterUserId: uid,
      productId: String(body?.productId || ""),
      productName: String(body?.productName || "상품"),
      quantity: body?.quantity,
      unitPriceKrw: body?.unitPriceKrw
    });
    return c.json({ ok: true, request: req });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.get("/enterprise/purchase-requests", requireUserHeader, requireEnterpriseMember, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const status = c.req.query("status");
    const list = await listPurchaseRequestsForEnterprise(uid, status || undefined);
    return c.json({ requests: list });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.post("/enterprise/purchase-requests/:id/review", requireUserHeader, requireEnterprisePurchaser, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{ action?: string; note?: string }>();
    const action = body?.action === "reject" ? "reject" : "approve";
    const updated = await reviewPurchaseRequest(uid, String(c.req.param("id") || ""), action, body?.note);
    return c.json({ ok: true, request: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.post("/enterprise/cart/items", requireUserHeader, requireEnterpriseMember, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      externalProductId?: string;
      productName?: string;
      quantity?: number;
      unitPriceKrw?: number;
    }>();
    const item = await addToEnterpriseProcurementCart(uid, {
      externalProductId: String(body?.externalProductId || ""),
      productName: String(body?.productName || ""),
      quantity: Number(body?.quantity) || 1,
      unitPriceKrw: Number(body?.unitPriceKrw) || 0
    });
    return c.json({ ok: true, item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.post("/enterprise/cart/share-to-chat", requireUserHeader, requireEnterprisePurchaser, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const result = await shareEnterpriseCartToGroupChat(uid);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.get("/enterprise/tax-export", requireUserHeader, requireEnterpriseAdmin, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const groupId = await assertTaxExportAccess(uid);
    const rows = await getEnterpriseTaxExportRows(groupId);
    return c.json({ rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.get("/enterprise/tax-export.csv", requireUserHeader, requireEnterpriseMember, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const groupId = await assertTaxExportAccess(uid);
    const { filename, content } = await buildTaxExportCsv(groupId);
    return new Response(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.get("/enterprise/tax-export/print", requireUserHeader, requireEnterpriseMember, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const groupId = await assertTaxExportAccess(uid);
    const html = await buildTaxExportHtml(groupId);
    return c.html(html);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.post("/enterprise/wallet/charge", requireUserHeader, requireEnterpriseAdmin, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{ amountKrw?: number }>();
    const amount = Math.max(0, Math.floor(Number(body?.amountKrw) || 0));
    const ctx = await loadEnterpriseUserContext(uid);
    if (!ctx?.enterpriseId) throw new Error("기업 계정 없음");
    const ent = await prisma.b2BEnterpriseAccount.update({
      where: { id: ctx.enterpriseId },
      data: { corporateWalletBalanceKrw: { increment: amount } }
    });
    return c.json({ ok: true, balanceKrw: ent.corporateWalletBalanceKrw });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

shopRoutes.post("/enterprise/corporate-card", requireUserHeader, requireEnterpriseAdmin, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{ last4?: string }>();
    const ctx = await loadEnterpriseUserContext(uid);
    if (!ctx?.enterpriseId) throw new Error("기업 계정 없음");
    const last4 = String(body?.last4 || "").replace(/\D/g, "").slice(-4);
    if (last4.length !== 4) throw new Error("카드 뒤 4자리를 입력해 주세요.");
    const ent = await prisma.b2BEnterpriseAccount.update({
      where: { id: ctx.enterpriseId },
      data: { corporateCardLast4: last4, corporateCardRegisteredAt: new Date() }
    });
    return c.json({ ok: true, last4: ent.corporateCardLast4 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});
