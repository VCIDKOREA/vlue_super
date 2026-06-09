import { prisma } from "../../db/client.js";
import { loadPricingConfig } from "../pricing/pricingConfigService.js";
import { getBroadcastLineForUser } from "./broadcastLineService.js";

export type MembershipAccessSnapshot = {
  hasPrimarySoho: boolean;
  hasBroadcastAddon: boolean;
  hasB2bLine: boolean;
  canUseChat: boolean;
  canUseShopping: boolean;
  canBroadcastDigitalCard: boolean;
  primaryMonthlyKrw: number;
  broadcastMonthlyKrw: number;
};

/**
 * Primary(SOHO 활동형 19,800원) — 채팅·쇼핑 등 핵심 기능
 * Broadcast(4,200원 옵션) — 등록 발신번호로 디지털인증명함 송출(Secondary)
 * B2B(14,700원/회선) — PC 전용, 대량 회선과 별도 SKU
 */
export async function resolveMembershipAccess(userId: string): Promise<MembershipAccessSnapshot> {
  const cfg = await loadPricingConfig();
  const primaryKrw = cfg.plans.soho_activity.monthlyKrw;
  const broadcastKrw = cfg.plans.soho_broadcast_addon.monthlyKrw;

  const [activeSub, corp, broadcast] = await Promise.all([
    prisma.userSubscription.findFirst({
      where: { userId, status: "active" },
      orderBy: { createdAt: "desc" },
      select: { amountKrw: true, isPersonalCombo: true }
    }),
    prisma.userCorporateMembership.findUnique({
      where: { userId },
      select: { enterpriseId: true }
    }),
    getBroadcastLineForUser(userId)
  ]);

  const hasB2bLine = Boolean(corp?.enterpriseId);
  const paidAmount = activeSub?.amountKrw ?? 0;
  const hasPrimarySoho =
    paidAmount === primaryKrw ||
    paidAmount === cfg.plans.soho_activity.annualKrw ||
    activeSub?.isPersonalCombo === true ||
    paidAmount >= cfg.legacy.paidListMonthlyKrw * (1 - cfg.legacy.referralDiscountRate);

  const broadcastPaid = Boolean(
    broadcast?.paidAt && (broadcast.status === "active" || broadcast.status === "paused")
  );
  const hasBroadcastAddon =
    broadcastPaid ||
    paidAmount === broadcastKrw ||
    paidAmount === cfg.plans.soho_broadcast_addon.annualKrw;

  const canBroadcastDigitalCard = Boolean(
    broadcast?.status === "active" &&
      broadcast.broadcastEnabled &&
      broadcast.phoneVerified &&
      broadcast.paidAt
  );

  return {
    hasPrimarySoho,
    hasBroadcastAddon,
    hasB2bLine,
    canUseChat: hasPrimarySoho || hasB2bLine,
    canUseShopping: hasPrimarySoho || hasB2bLine,
    canBroadcastDigitalCard,
    primaryMonthlyKrw: primaryKrw,
    broadcastMonthlyKrw: broadcastKrw
  };
}

/** DB 미연결 등 — 발신번호 파일 저장소 기준 폴백 */
export async function resolveMembershipAccessSafe(userId: string): Promise<MembershipAccessSnapshot> {
  try {
    return await resolveMembershipAccess(userId);
  } catch (err) {
    console.warn("[membership-access] fallback", err);
    const cfg = await loadPricingConfig();
    const broadcast = await getBroadcastLineForUser(userId);
    const broadcastPaid = Boolean(
      broadcast?.paidAt && (broadcast.status === "active" || broadcast.status === "paused")
    );
    const canBroadcast = Boolean(
      broadcast?.status === "active" &&
        broadcast.broadcastEnabled &&
        broadcast.phoneVerified &&
        broadcast.paidAt
    );
    const devRelax = process.env.NODE_ENV !== "production";
    return {
      hasPrimarySoho: devRelax,
      hasBroadcastAddon: broadcastPaid,
      hasB2bLine: false,
      canUseChat: devRelax,
      canUseShopping: devRelax,
      canBroadcastDigitalCard: canBroadcast,
      primaryMonthlyKrw: cfg.plans.soho_activity.monthlyKrw,
      broadcastMonthlyKrw: cfg.plans.soho_broadcast_addon.monthlyKrw
    };
  }
}

export async function assertPrimaryFeatureAccess(userId: string, feature: "chat" | "shopping") {
  const access = await resolveMembershipAccess(userId);
  const ok = feature === "chat" ? access.canUseChat : access.canUseShopping;
  if (!ok) {
    throw new Error(
      `SOHO 활동형(월 ${access.primaryMonthlyKrw.toLocaleString("ko-KR")}원) 또는 B2B 회선이 필요합니다.`
    );
  }
  return access;
}

export async function assertBroadcastFeatureAccess(userId: string) {
  const access = await resolveMembershipAccess(userId);
  if (!access.canBroadcastDigitalCard) {
    throw new Error(
      `영업 송출 옵션(월 ${access.broadcastMonthlyKrw.toLocaleString("ko-KR")}원) 결제 및 발신번호 인증이 필요합니다.`
    );
  }
  if (!access.hasPrimarySoho) {
    throw new Error("영업 송출 옵션은 SOHO 활동형 Primary 계정이 먼저 필요합니다.");
  }
  return access;
}
