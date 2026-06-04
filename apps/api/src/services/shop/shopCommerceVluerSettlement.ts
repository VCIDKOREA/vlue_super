import { prisma } from "../../db/client.js";
import { referralDb } from "../../db/referralDb.js";
import { isUserB2bSettlementExcluded } from "../b2b/vluerEligibility.js";
import { calculateVluerCommission, recordCommissionLedger } from "../vluer/settlementEngine.js";

function shopLedgerRef(merchantUid: string) {
  return `shop:${merchantUid}`;
}

/** 상점 결제 완료 시 스폰서 VLUER 쇼핑 커머스 쉐어 정산 (멱등) */
export async function settleShopCommerceVluerCommission(order: {
  id: string;
  merchantUid: string;
  buyerUserId: string;
  totalAmountKrw: number;
}) {
  const ref = shopLedgerRef(order.merchantUid);
  const existing = await prisma.commissionLedger.findFirst({
    where: { referralCode: ref, kind: "commerce" },
    select: { id: true }
  });
  if (existing) return { skipped: true as const, reason: "already_settled" };

  let sponsorUserId: string | null = null;
  let referralCodeUsed: string | null = null;
  try {
    const attr = await referralDb.referralAttribution.findUnique({
      where: { userId: order.buyerUserId },
      select: { sponsorVluerUserId: true, referralCodeUsed: true }
    });
    sponsorUserId = attr?.sponsorVluerUserId ?? null;
    referralCodeUsed = attr?.referralCodeUsed ?? null;
  } catch {
    return { skipped: true as const, reason: "referral_db_unavailable" };
  }

  if (!sponsorUserId) {
    return { skipped: true as const, reason: "no_sponsor" };
  }

  const payerIsB2b = await isUserB2bSettlementExcluded(order.buyerUserId);
  const vluerIsB2bBlocked = await isUserB2bSettlementExcluded(sponsorUserId);

  const result = await calculateVluerCommission({
    vluerUserId: sponsorUserId,
    payerUserId: order.buyerUserId,
    kind: "commerce",
    grossPaymentKrw: order.totalAmountKrw,
    referralCode: ref,
    payerIsB2bMember: payerIsB2b,
    vluerIsB2bBlocked
  });

  const ledger = await recordCommissionLedger({
    vluerUserId: sponsorUserId,
    payerUserId: order.buyerUserId,
    kind: "commerce",
    grossPaymentKrw: order.totalAmountKrw,
    referralCode: ref,
    payerIsB2bMember: payerIsB2b,
    vluerIsB2bBlocked,
    result
  });

  return {
    skipped: false as const,
    commissionKrw: result.commissionKrw,
    tierCode: result.tierCode,
    blockedReason: result.blockedReason,
    ledgerId: ledger?.id ?? null
  };
}
