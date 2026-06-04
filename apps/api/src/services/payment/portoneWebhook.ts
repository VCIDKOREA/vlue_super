import { prisma } from "../../db/client.js";
import { finalizeShopOrderFromPortoneWebhook } from "../shop/shopPaymentComplete.js";
import { SHOP_ORDER_MERCHANT_PREFIX } from "../shop/shopOrderPrepare.js";
import { activateVmingUnlimitedByPayment } from "../vming/vmingUsageService.js";

let webhookLogReady = false;

async function ensureWebhookLogTable() {
  if (webhookLogReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider VARCHAR(40) NOT NULL,
      imp_uid VARCHAR(120) NOT NULL,
      merchant_uid VARCHAR(160) NOT NULL,
      status VARCHAR(40),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, imp_uid, merchant_uid)
    );
  `);
  webhookLogReady = true;
}

export type PortoneWebhookPayload = {
  imp_uid?: string;
  merchant_uid?: string;
  status?: string;
  [key: string]: unknown;
};

export async function handlePortonePaymentWebhook(body: PortoneWebhookPayload) {
  await ensureWebhookLogTable();
  const impUid = String(body.imp_uid || "").trim();
  const merchantUid = String(body.merchant_uid || "").trim();
  const status = String(body.status || "").trim();

  const result: Record<string, unknown> = {
    impUid,
    merchantUid,
    status,
    branch: "none"
  };

  if (!merchantUid || !impUid) {
    result.branch = "ignored_missing_fields";
    return result;
  }

  try {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO payment_webhook_events (provider, imp_uid, merchant_uid, status, payload)
        VALUES ('portone', $1, $2, $3, $4::jsonb);
      `,
      impUid,
      merchantUid,
      status || null,
      JSON.stringify(body || {})
    );
  } catch {
    result.branch = "idempotent_duplicate";
    result.duplicate = true;
    return result;
  }

  if (merchantUid.startsWith(SHOP_ORDER_MERCHANT_PREFIX)) {
    result.branch = "shop_order";
    if (status !== "paid") {
      if (status === "failed" || status === "cancelled") {
        await prisma.shopOrder.updateMany({
          where: { merchantUid, status: "pending_payment" },
          data: { status: "failed", portoneStatus: status }
        });
        result.shop = { ok: false, reason: status };
      } else {
        result.shop = { ok: false, reason: `awaiting_${status}` };
      }
      return result;
    }

    const shop = await finalizeShopOrderFromPortoneWebhook(merchantUid, impUid);
    result.shop = shop;
    return result;
  }

  if (merchantUid.startsWith("renew_") || merchantUid.startsWith("billing_")) {
    result.branch = "subscription";
    if (status === "paid") {
      const pay = await prisma.subscriptionPayment.findUnique({ where: { merchantUid } });
      if (pay && pay.status !== "paid") {
        await prisma.subscriptionPayment.update({
          where: { merchantUid },
          data: {
            status: "paid",
            impUid,
            portoneStatus: status,
            paidAt: new Date(),
            rawResponse: body as object
          }
        });
        result.subscription = { synced: true, merchantUid };
      } else {
        result.subscription = { synced: false, reason: pay ? "already_paid" : "not_found" };
      }
    } else if (status === "failed" || status === "cancelled") {
      await prisma.subscriptionPayment.updateMany({
        where: { merchantUid, status: { not: "paid" } },
        data: { status: "failed", portoneStatus: status }
      });
      result.subscription = { synced: true, status };
    }
    return result;
  }

  if (merchantUid.startsWith("vming_unlimited_")) {
    result.branch = "vming_unlimited";
    if (status === "paid") {
      const userId = merchantUid.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0] || "";
      if (userId) {
        result.vming = await activateVmingUnlimitedByPayment({
          userId,
          merchantUid,
          provider: "portone_webhook",
          impUid
        });
      } else {
        result.vming = { ok: false, reason: "user_id_missing_in_merchant_uid" };
      }
    } else {
      result.vming = { ok: false, reason: `status_${status}` };
    }
    return result;
  }

  result.branch = "unhandled_merchant";
  return result;
}
