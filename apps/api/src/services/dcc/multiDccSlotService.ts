import { randomUUID } from "crypto";
import { prisma } from "../../db/client.js";
import { getPricingConfigSync } from "../pricing/pricingConfigService.js";

/** 마스터 1슬롯 무료, 추가 슬롯당 SOHO +4,200원 */
export const MULTI_DCC_FREE_SLOTS = 1;

let initialized = false;

export async function ensureMultiDccSlotTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS multi_dcc_slot_entitlements (
      user_id UUID PRIMARY KEY,
      paid_slots INT NOT NULL DEFAULT 0,
      last_merchant_uid VARCHAR(120),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS multi_dcc_slot_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      amount_krw INT NOT NULL,
      billing_cycle VARCHAR(16) NOT NULL DEFAULT 'monthly',
      merchant_uid VARCHAR(120) NOT NULL,
      customer_uid VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_multi_dcc_pay_user ON multi_dcc_slot_payments(user_id, created_at DESC);"
  );
  initialized = true;
}

export function multiDccSlotMonthlyKrw(): number {
  try {
    return Number(getPricingConfigSync().plans.soho_broadcast_addon.monthlyKrw) || 4200;
  } catch {
    return 4200;
  }
}

export async function getMultiDccSlotEntitlement(userId: string) {
  await ensureMultiDccSlotTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ paid_slots: number }>>(
    `SELECT paid_slots FROM multi_dcc_slot_entitlements WHERE user_id = $1::uuid LIMIT 1;`,
    userId
  );
  const paidSlots = Math.max(0, Number(rows[0]?.paid_slots) || 0);
  const monthlyKrw = multiDccSlotMonthlyKrw();
  return {
    freeSlots: MULTI_DCC_FREE_SLOTS,
    paidSlots,
    allowedSlots: MULTI_DCC_FREE_SLOTS + paidSlots,
    monthlyKrw,
    sku: "multi_dcc_slot_addon"
  };
}

export async function assertCanCreateMultiDccSlot(userId: string, currentCount: number) {
  const ent = await getMultiDccSlotEntitlement(userId);
  if (currentCount >= ent.allowedSlots) {
    const err = new Error(
      `추가 멀티 DCC는 장당 월 ${ent.monthlyKrw.toLocaleString("ko-KR")}원(SOHO) 결제가 필요합니다.`
    );
    (err as Error & { status?: number; code?: string }).status = 402;
    (err as Error & { code?: string }).code = "MULTI_DCC_PAYMENT_REQUIRED";
    throw err;
  }
  return ent;
}

export async function completeMultiDccSlotPayment(input: {
  userId: string;
  amountKrw: number;
  billingCycle?: string;
  merchantUid: string;
  customerUid?: string;
  slotsToAdd?: number;
}) {
  await ensureMultiDccSlotTable();
  const expected = multiDccSlotMonthlyKrw();
  const amount = Number(input.amountKrw) || 0;
  if (amount !== expected && amount !== expected * 10) {
    throw new Error("INVALID_AMOUNT");
  }
  const add = Math.max(1, Math.min(5, Number(input.slotsToAdd) || 1));
  const merchantUid = String(input.merchantUid || "").trim() || `multi_dcc_${randomUUID()}`;

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO multi_dcc_slot_payments (id, user_id, amount_krw, billing_cycle, merchant_uid, customer_uid)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6);
    `,
    randomUUID(),
    input.userId,
    amount,
    input.billingCycle === "annual" ? "annual" : "monthly",
    merchantUid,
    input.customerUid || null
  );

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO multi_dcc_slot_entitlements (user_id, paid_slots, last_merchant_uid, updated_at)
      VALUES ($1::uuid, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET paid_slots = multi_dcc_slot_entitlements.paid_slots + $2,
          last_merchant_uid = $3,
          updated_at = NOW();
    `,
    input.userId,
    add,
    merchantUid
  );

  return getMultiDccSlotEntitlement(input.userId);
}
