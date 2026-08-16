import { randomUUID } from "node:crypto";
import { Prisma, type LineSubscriptionStatus, type UserSubscriptionPlan } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { chargeSubscribeWithPortoneSecrets } from "../../integrations/portone/iamportBilling.js";
import { formatPhoneDisplayKR } from "../../lib/phoneDisplay.js";
import { addMonths } from "../membership/subscriptionBilling.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";
import { ssePublish } from "../../realtime/sseHub.js";

export const LINE_GRACE_DAYS = 7;
export const LINE_GRACE_PIN_KIND = "line_grace";

const EXPIRED_SUBTITLE = "인증기간이 만료된 번호입니다.";
const EXPIRED_DETAIL = "인증기간이 만료된 번호입니다. 직접 확인 부탁드립니다.";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} 환경변수가 필요합니다.`);
  return v;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function kstDateTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function gracePinKey(lineSubscriptionId: string): string {
  return `line_grace:${lineSubscriptionId}`;
}

export function isLineBroadcastStopped(status: LineSubscriptionStatus | string | null | undefined): boolean {
  return status === "grace" || status === "cancelled" || status === "lapsed";
}

export function isLineExpiredOverlay(status: LineSubscriptionStatus | string | null | undefined): boolean {
  return status === "grace";
}

async function notifyOwner(opts: {
  userId: string;
  title: string;
  body: string;
  pinKind?: string | null;
  pinKey?: string | null;
  payload?: Record<string, unknown> | null;
  pushType?: string;
}) {
  const row = await prisma.ownerNotification.create({
    data: {
      ownerUserId: opts.userId,
      title: opts.title.slice(0, 120),
      body: opts.body.slice(0, 4000),
      pinKind: opts.pinKind || null,
      pinKey: opts.pinKey || null,
      payloadJson: (opts.payload ?? undefined) as Prisma.InputJsonValue | undefined
    }
  });
  try {
    ssePublish(opts.userId, {
      type: opts.pushType || "vlue-line-billing",
      title: opts.title,
      body: opts.body,
      notificationId: row.id,
      pinKind: opts.pinKind || null,
      at: new Date().toISOString()
    });
  } catch (e) {
    console.warn("[line-billing] sse", e);
  }
  try {
    await sendOfficePushToUser(opts.userId, opts.title, opts.body.slice(0, 180), {
      type: opts.pushType || "vlue-line-billing",
      notificationId: row.id,
      pinKind: String(opts.pinKind || "")
    });
  } catch (e) {
    console.warn("[line-billing] fcm", e);
  }
  return row;
}

async function deletePinnedGraceNotice(userId: string, lineSubscriptionId: string) {
  await prisma.ownerNotification.deleteMany({
    where: { ownerUserId: userId, pinKey: gracePinKey(lineSubscriptionId) }
  });
}

export type LineBillingDto = {
  id: string;
  businessCardId: string;
  phoneE164: string;
  phoneDisplay: string;
  displayName: string;
  kind: string;
  isCertified: boolean;
  status: LineSubscriptionStatus;
  amountKrw: number;
  plan: UserSubscriptionPlan;
  cycleEndAt: string;
  nextChargeAt: string | null;
  graceStartedAt: string | null;
  graceEndsAt: string | null;
  graceDaysLeft: number | null;
  broadcastStopped: boolean;
  expiredOverlay: boolean;
  expiredSubtitle: string;
  expiredDetail: string;
};

function toDto(
  row: {
    id: string;
    businessCardId: string;
    status: LineSubscriptionStatus;
    amountKrw: number;
    plan: UserSubscriptionPlan;
    cycleEndAt: Date;
    nextChargeAt: Date | null;
    graceStartedAt: Date | null;
    graceEndsAt: Date | null;
    businessCard: { phoneE164: string; displayName: string | null; kind: string };
  },
  certifiedPhone: string | null,
  asOf = new Date()
): LineBillingDto {
  const graceDaysLeft =
    row.status === "grace" && row.graceEndsAt
      ? Math.max(0, Math.ceil((row.graceEndsAt.getTime() - asOf.getTime()) / 86400000))
      : null;
  return {
    id: row.id,
    businessCardId: row.businessCardId,
    phoneE164: row.businessCard.phoneE164,
    phoneDisplay: formatPhoneDisplayKR(row.businessCard.phoneE164),
    displayName: row.businessCard.displayName || "",
    kind: row.businessCard.kind,
    isCertified: Boolean(certifiedPhone) && row.businessCard.phoneE164 === certifiedPhone,
    status: row.status,
    amountKrw: row.amountKrw,
    plan: row.plan,
    cycleEndAt: row.cycleEndAt.toISOString(),
    nextChargeAt: row.nextChargeAt?.toISOString() || null,
    graceStartedAt: row.graceStartedAt?.toISOString() || null,
    graceEndsAt: row.graceEndsAt?.toISOString() || null,
    graceDaysLeft,
    broadcastStopped: isLineBroadcastStopped(row.status),
    expiredOverlay: isLineExpiredOverlay(row.status),
    expiredSubtitle: EXPIRED_SUBTITLE,
    expiredDetail: EXPIRED_DETAIL
  };
}

const LINE_INCLUDE = {
  businessCard: { select: { phoneE164: true, displayName: true, kind: true, userId: true } }
} as const;

async function certifiedPhoneOf(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneE164: true }
  });
  return user?.phoneE164 || null;
}

export async function ensureLineSubscriptionForCard(opts: {
  userId: string;
  businessCardId: string;
  amountKrw: number;
  plan?: UserSubscriptionPlan;
  userSubscriptionId?: string | null;
  portoneCustomerUid?: string | null;
  cycleStartAt?: Date;
  cycleEndAt?: Date;
  status?: LineSubscriptionStatus;
}): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.lineSubscription.findUnique({
    where: { businessCardId: opts.businessCardId },
    select: { id: true }
  });
  if (existing) return { id: existing.id, created: false };

  const now = opts.cycleStartAt || new Date();
  const plan = opts.plan || "b2c_monthly";
  const cycleEnd = opts.cycleEndAt || addMonths(now, plan === "b2c_annual" ? 12 : 1);
  const created = await prisma.lineSubscription.create({
    data: {
      userId: opts.userId,
      businessCardId: opts.businessCardId,
      userSubscriptionId: opts.userSubscriptionId || null,
      plan,
      status: opts.status || "pending_payment",
      amountKrw: Math.max(0, Math.floor(opts.amountKrw)),
      cycleStartAt: now,
      cycleEndAt: cycleEnd,
      nextChargeAt: opts.status === "active" ? cycleEnd : null,
      portoneCustomerUid: opts.portoneCustomerUid || null
    },
    select: { id: true }
  });
  return { id: created.id, created: true };
}

/** 계정 구독(인증번호) → 해당 BusinessCard LineSubscription 동기화 */
export async function syncCertifiedLineFromUserSubscription(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneE164: true }
  });
  const phone = user?.phoneE164;
  if (!phone) return null;
  const card = await prisma.businessCard.findFirst({
    where: { userId, phoneE164: phone },
    select: { id: true }
  });
  if (!card) return null;
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["active", "pending_payment"] } },
    orderBy: { createdAt: "desc" }
  });
  if (!sub) return null;
  const ensured = await ensureLineSubscriptionForCard({
    userId,
    businessCardId: card.id,
    amountKrw: sub.amountKrw,
    plan: sub.plan,
    userSubscriptionId: sub.id,
    portoneCustomerUid: sub.portoneCustomerUid,
    cycleStartAt: sub.cycleStartAt,
    cycleEndAt: sub.cycleEndAt,
    status: sub.status === "active" ? "active" : "pending_payment"
  });
  await prisma.lineSubscription.update({
    where: { id: ensured.id },
    data: {
      userSubscriptionId: sub.id,
      plan: sub.plan,
      amountKrw: sub.amountKrw,
      portoneCustomerUid: sub.portoneCustomerUid,
      ...(sub.status === "active"
        ? {
            cycleStartAt: sub.cycleStartAt,
            cycleEndAt: sub.cycleEndAt,
            nextChargeAt: sub.nextChargeAt
          }
        : {})
    }
  });
  return ensured.id;
}

export async function enterLineGrace(
  lineSubscriptionId: string,
  reason = "payment_failed",
  asOf = new Date()
): Promise<LineBillingDto | null> {
  const row = await prisma.lineSubscription.findUnique({
    where: { id: lineSubscriptionId },
    include: LINE_INCLUDE
  });
  if (!row) return null;
  if (row.status === "grace" || row.status === "lapsed" || row.status === "cancelled") {
    const phone = await certifiedPhoneOf(row.userId);
    return toDto(row, phone, asOf);
  }

  const graceEndsAt = addDays(asOf, LINE_GRACE_DAYS);
  const updated = await prisma.lineSubscription.update({
    where: { id: row.id },
    data: {
      status: "grace",
      graceStartedAt: asOf,
      graceEndsAt,
      nextChargeAt: null
    },
    include: LINE_INCLUDE
  });

  const phone = await certifiedPhoneOf(row.userId);
  const dto = toDto(updated, phone, asOf);
  const pinKey = gracePinKey(row.id);
  await prisma.ownerNotification.deleteMany({
    where: { ownerUserId: row.userId, pinKey }
  });
  const title = "인증기간이 만료되었습니다";
  const body = [
    `${dto.phoneDisplay} 회선의 결제가 확인되지 않아 DCC·쇼케이스 송출이 즉시 중단되었습니다.`,
    `유예 기간은 ${kstDateTime(graceEndsAt)}까지입니다. 이 기간 안에 결제하면 즉시 복구됩니다.`,
    `유예 기간이 지나면 일반 미인증 번호로 전환되고 해당 회선 쇼케이스 데이터는 삭제됩니다.`,
    reason === "payment_failed" ? "원인: 결제 실패 또는 결제일 누락" : `원인: ${reason}`
  ].join("\n");
  await notifyOwner({
    userId: row.userId,
    title,
    body,
    pinKind: LINE_GRACE_PIN_KIND,
    pinKey,
    payload: {
      lineSubscriptionId: row.id,
      businessCardId: row.businessCardId,
      phoneE164: dto.phoneE164,
      graceEndsAt: graceEndsAt.toISOString()
    },
    pushType: "vlue-line-grace"
  });
  return dto;
}

export async function enterGraceForUserSubscription(
  userSubscriptionId: string,
  reason = "payment_failed",
  asOf = new Date()
): Promise<LineBillingDto[]> {
  const sub = await prisma.userSubscription.findUnique({
    where: { id: userSubscriptionId },
    select: { userId: true }
  });
  if (!sub) return [];
  await syncCertifiedLineFromUserSubscription(sub.userId);
  const targets = await prisma.lineSubscription.findMany({
    where: {
      userId: sub.userId,
      userSubscriptionId,
      status: { in: ["active", "pending_payment"] }
    },
    select: { id: true }
  });
  const out: LineBillingDto[] = [];
  for (const row of targets) {
    const dto = await enterLineGrace(row.id, reason, asOf);
    if (dto) out.push(dto);
  }
  return out;
}

export async function restoreLineFromPayment(
  lineSubscriptionId: string,
  opts: {
    amountKrw?: number;
    cycleMonths?: number;
    portoneCustomerUid?: string | null;
    impUid?: string | null;
    merchantUid?: string | null;
  } = {}
): Promise<LineBillingDto | null> {
  const row = await prisma.lineSubscription.findUnique({
    where: { id: lineSubscriptionId },
    include: LINE_INCLUDE
  });
  if (!row) return null;
  const now = new Date();
  const months = opts.cycleMonths ?? (row.plan === "b2c_annual" ? 12 : 1);
  const cycleEnd = addMonths(now, months);
  const updated = await prisma.lineSubscription.update({
    where: { id: row.id },
    data: {
      status: "active",
      amountKrw: opts.amountKrw ?? row.amountKrw,
      cycleStartAt: now,
      cycleEndAt: cycleEnd,
      nextChargeAt: cycleEnd,
      graceStartedAt: null,
      graceEndsAt: null,
      lapsedAt: null,
      cancelledAt: null,
      cancelReason: null,
      lastPaymentAt: now,
      portoneCustomerUid: opts.portoneCustomerUid ?? row.portoneCustomerUid
    },
    include: LINE_INCLUDE
  });

  if (row.userSubscriptionId) {
    await prisma.userSubscription.updateMany({
      where: { id: row.userSubscriptionId },
      data: {
        status: "active",
        cycleStartAt: now,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        cancelledAt: null,
        cancelReason: null,
        portoneCustomerUid: opts.portoneCustomerUid ?? row.portoneCustomerUid
      }
    });
    await prisma.digitalCard.upsert({
      where: { userId: row.userId },
      create: { userId: row.userId, membershipTierSnapshot: "paid" },
      update: { membershipTierSnapshot: "paid" }
    });
  }

  await deletePinnedGraceNotice(row.userId, row.id);
  const phone = await certifiedPhoneOf(row.userId);
  const dto = toDto(updated, phone, now);
  const paidAtLabel = kstDateTime(now);
  await notifyOwner({
    userId: row.userId,
    title: "회선 결제가 완료되었습니다",
    body: `${dto.phoneDisplay} 회선 결제가 ${paidAtLabel}에 완료되어 DCC·쇼케이스 송출이 즉시 복구되었습니다.`,
    payload: {
      lineSubscriptionId: row.id,
      paidAt: now.toISOString(),
      amountKrw: updated.amountKrw,
      merchantUid: opts.merchantUid || null,
      impUid: opts.impUid || null
    },
    pushType: "vlue-line-paid"
  });
  return dto;
}

export async function cancelLineSubscription(
  lineSubscriptionId: string,
  userId: string,
  reason = "user_cancel"
): Promise<LineBillingDto | null> {
  const row = await prisma.lineSubscription.findFirst({
    where: { id: lineSubscriptionId, userId },
    include: LINE_INCLUDE
  });
  if (!row) return null;
  if (row.status === "cancelled" || row.status === "lapsed") {
    const phone = await certifiedPhoneOf(userId);
    return toDto(row, phone);
  }
  const now = new Date();
  const updated = await prisma.lineSubscription.update({
    where: { id: row.id },
    data: {
      status: "cancelled",
      cancelledAt: now,
      cancelReason: reason.slice(0, 120),
      nextChargeAt: null,
      graceStartedAt: null,
      graceEndsAt: null
    },
    include: LINE_INCLUDE
  });
  if (row.userSubscriptionId) {
    await prisma.userSubscription.updateMany({
      where: { id: row.userSubscriptionId, userId },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelReason: reason.slice(0, 120),
        nextChargeAt: null
      }
    });
  }
  await deletePinnedGraceNotice(userId, row.id);
  const phone = await certifiedPhoneOf(userId);
  const dto = toDto(updated, phone, now);
  await notifyOwner({
    userId,
    title: "회선 구독이 해지되었습니다",
    body: `${dto.phoneDisplay} 회선 구독이 ${kstDateTime(now)}에 해지되었습니다. 해당 회선 DCC·쇼케이스 송출은 중단됩니다.`,
    payload: {
      lineSubscriptionId: row.id,
      cancelledAt: now.toISOString(),
      reason
    },
    pushType: "vlue-line-cancelled"
  });
  return dto;
}

async function hardDeleteLineShowcase(businessCardId: string, userId: string, isCertified: boolean) {
  await prisma.businessCard.update({
    where: { id: businessCardId },
    data: {
      dccSnapshotJson: Prisma.DbNull,
      lineShowcaseStyleJson: Prisma.DbNull,
      lineShowcaseLiveStyleJson: Prisma.DbNull,
      lineShowcaseLiveSourceJson: Prisma.DbNull,
      lineShowcaseUpdatedAt: null,
      activeDccAgentProfileId: null,
      profileJson: Prisma.DbNull
    }
  });
  if (isCertified) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        showcaseStyleJson: Prisma.DbNull,
        showcaseLiveStyleJson: Prisma.DbNull
      }
    });
  }
}

export async function enterGraceForOverdueActiveLines(asOf = new Date()) {
  const overdue = await prisma.lineSubscription.findMany({
    where: {
      status: "active",
      amountKrw: { gt: 0 },
      cycleEndAt: { lt: asOf },
      OR: [{ nextChargeAt: null }, { nextChargeAt: { lt: asOf } }]
    },
    select: { id: true }
  });
  let entered = 0;
  for (const row of overdue) {
    const dto = await enterLineGrace(row.id, "cycle_unpaid", asOf);
    if (dto?.status === "grace") entered += 1;
  }
  return { scanned: overdue.length, entered };
}

export async function lapseExpiredGraceLines(asOf = new Date()): Promise<{ scanned: number; lapsed: number }> {
  const due = await prisma.lineSubscription.findMany({
    where: {
      status: "grace",
      graceEndsAt: { lte: asOf }
    },
    include: LINE_INCLUDE
  });
  let lapsed = 0;
  for (const row of due) {
    const certifiedPhone = await certifiedPhoneOf(row.userId);
    const isCertified = Boolean(certifiedPhone) && row.businessCard.phoneE164 === certifiedPhone;
    await hardDeleteLineShowcase(row.businessCardId, row.userId, isCertified);
    await prisma.lineSubscription.update({
      where: { id: row.id },
      data: {
        status: "lapsed",
        lapsedAt: asOf,
        showcasePurgedAt: asOf,
        nextChargeAt: null
      }
    });
    if (row.userSubscriptionId && isCertified) {
      await prisma.userSubscription.updateMany({
        where: { id: row.userSubscriptionId },
        data: { status: "cancelled", cancelledAt: asOf, cancelReason: "grace_lapsed", nextChargeAt: null }
      });
      await prisma.digitalCard.updateMany({
        where: { userId: row.userId, membershipTierSnapshot: { in: ["paid", "standard", "premium"] } },
        data: { membershipTierSnapshot: "free" }
      });
    }
    await deletePinnedGraceNotice(row.userId, row.id);
    const phoneDisplay = formatPhoneDisplayKR(row.businessCard.phoneE164);
    await notifyOwner({
      userId: row.userId,
      title: "유예 기간이 종료되었습니다",
      body: `${phoneDisplay} 회선이 일반 미인증 번호로 전환되었고, 저장된 쇼케이스 데이터가 삭제되었습니다.`,
      payload: { lineSubscriptionId: row.id, lapsedAt: asOf.toISOString() },
      pushType: "vlue-line-lapsed"
    });
    lapsed += 1;
  }
  return { scanned: due.length, lapsed };
}

export async function getOwnerLineBillingStatus(userId: string, asOf = new Date()) {
  await syncCertifiedLineFromUserSubscription(userId).catch(() => null);
  const certifiedPhone = await certifiedPhoneOf(userId);
  const rows = await prisma.lineSubscription.findMany({
    where: { userId },
    include: LINE_INCLUDE,
    orderBy: { createdAt: "asc" }
  });
  const lines = rows.map((row) => toDto(row, certifiedPhone, asOf));
  const graceLines = lines.filter((l) => l.status === "grace");
  return {
    lines,
    graceLines,
    hasGrace: graceLines.length > 0,
    expiredSubtitle: EXPIRED_SUBTITLE,
    expiredDetail: EXPIRED_DETAIL
  };
}

export async function getLineBillingByCardId(businessCardId: string, asOf = new Date()) {
  const row = await prisma.lineSubscription.findUnique({
    where: { businessCardId },
    include: LINE_INCLUDE
  });
  if (!row) return null;
  const phone = await certifiedPhoneOf(row.userId);
  return toDto(row, phone, asOf);
}

function lineMerchantUid(lineSubscriptionId: string, asOf: Date): string {
  const stamp = asOf.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `line_${lineSubscriptionId.slice(0, 8)}_${stamp}_${randomUUID().slice(0, 6)}`;
}

export async function chargeLineSubscription(
  lineSubscriptionId: string,
  userId: string,
  asOf = new Date()
): Promise<{ ok: true; dto: LineBillingDto; merchantUid: string; impUid: string | null } | { ok: false; error: string }> {
  const row = await prisma.lineSubscription.findFirst({
    where: { id: lineSubscriptionId, userId },
    include: LINE_INCLUDE
  });
  if (!row) return { ok: false, error: "회선 구독을 찾을 수 없습니다." };
  if (row.status === "cancelled" || row.status === "lapsed") {
    return { ok: false, error: "해지되었거나 만료된 회선입니다. 다시 신청해 주세요." };
  }
  const customerUid =
    row.portoneCustomerUid ||
    (
      await prisma.userSubscription.findFirst({
        where: { userId, portoneCustomerUid: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { portoneCustomerUid: true }
      })
    )?.portoneCustomerUid;
  if (!customerUid) {
    return { ok: false, error: "저장된 결제 수단이 없습니다. 결제 페이지에서 카드 등록 후 진행해 주세요." };
  }

  const merchantUid = lineMerchantUid(row.id, asOf);
  const amount = Math.max(0, row.amountKrw);
  if (amount <= 0) {
    const dto = await restoreLineFromPayment(row.id, { amountKrw: 0, portoneCustomerUid: customerUid });
    return dto
      ? { ok: true, dto, merchantUid, impUid: null }
      : { ok: false, error: "복구에 실패했습니다." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phoneE164: true }
  });

  let impUid: string | null = null;
  let portoneStatus = "paid";
  let rawResponse: Record<string, unknown> | null = null;
  const allowDev =
    process.env.VLUE_CRON_DEV_BYPASS_BILLING === "1" ||
    process.env.VLUE_ALLOW_DEV_BILLING === "1" ||
    process.env.PORTONE_TEST_MODE === "1";

  try {
    if (allowDev && process.env.NODE_ENV !== "production") {
      impUid = `dev_line_${merchantUid}`;
      rawResponse = { devBypass: true };
    } else {
      const charged = await chargeSubscribeWithPortoneSecrets(
        requireEnv("PORTONE_API_KEY"),
        requireEnv("PORTONE_API_SECRET"),
        {
          customer_uid: customerUid,
          merchant_uid: merchantUid,
          amount,
          name: `VLUE 회선 구독 ${formatPhoneDisplayKR(row.businessCard.phoneE164)}`,
          buyer_email: user?.email || undefined,
          buyer_tel: user?.phoneE164?.replace(/^\+82/, "0") || undefined
        }
      );
      impUid = charged.imp_uid || null;
      portoneStatus = charged.status || "paid";
      rawResponse = charged as Record<string, unknown>;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.lineSubscriptionPayment.create({
      data: {
        userId,
        lineSubscriptionId: row.id,
        merchantUid,
        customerUid,
        amountKrw: amount,
        status: "failed",
        portoneStatus: "failed",
        failureReason: msg.slice(0, 240),
        rawResponse: { error: msg }
      }
    });
    if (row.status !== "grace") {
      await enterLineGrace(row.id, "payment_failed", asOf);
    }
    return { ok: false, error: msg };
  }

  await prisma.lineSubscriptionPayment.create({
    data: {
      userId,
      lineSubscriptionId: row.id,
      merchantUid,
      impUid,
      customerUid,
      amountKrw: amount,
      status: "paid",
      portoneStatus,
      paidAt: asOf,
      rawResponse: (rawResponse ?? undefined) as Prisma.InputJsonValue | undefined
    }
  });
  const dto = await restoreLineFromPayment(row.id, {
    amountKrw: amount,
    portoneCustomerUid: customerUid,
    impUid,
    merchantUid
  });
  if (!dto) return { ok: false, error: "결제 후 복구에 실패했습니다." };
  return { ok: true, dto, merchantUid, impUid };
}

/** 장바구니: 여러 회선을 한 번에 신청하되 구독 행은 회선별로 생성 */
export async function prepareLineCart(opts: {
  userId: string;
  businessCardIds: string[];
  amountKrw: number;
  plan?: UserSubscriptionPlan;
}): Promise<LineBillingDto[]> {
  const uniqueIds = [...new Set(opts.businessCardIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const cards = await prisma.businessCard.findMany({
    where: { userId: opts.userId, id: { in: uniqueIds } },
    select: { id: true }
  });
  const found = new Set(cards.map((c) => c.id));
  const missing = uniqueIds.filter((id) => !found.has(id));
  if (missing.length) {
    throw new Error("본인 회선만 신청할 수 있습니다.");
  }
  const accountSub = await prisma.userSubscription.findFirst({
    where: { userId: opts.userId, portoneCustomerUid: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, portoneCustomerUid: true, plan: true }
  });
  const certifiedPhone = await certifiedPhoneOf(opts.userId);
  const certifiedCard = certifiedPhone
    ? await prisma.businessCard.findFirst({
        where: { userId: opts.userId, phoneE164: certifiedPhone },
        select: { id: true }
      })
    : null;
  const out: LineBillingDto[] = [];
  for (const cardId of uniqueIds) {
    const isCertified = certifiedCard?.id === cardId;
    const ensured = await ensureLineSubscriptionForCard({
      userId: opts.userId,
      businessCardId: cardId,
      amountKrw: opts.amountKrw,
      plan: opts.plan || accountSub?.plan || "b2c_monthly",
      userSubscriptionId: isCertified ? accountSub?.id || null : null,
      portoneCustomerUid: accountSub?.portoneCustomerUid || null,
      status: "pending_payment"
    });
    const current = await prisma.lineSubscription.findUnique({
      where: { id: ensured.id },
      select: { status: true }
    });
    if (current?.status !== "active" && current?.status !== "grace") {
      await prisma.lineSubscription.update({
        where: { id: ensured.id },
        data: {
          amountKrw: Math.max(0, Math.floor(opts.amountKrw)),
          plan: opts.plan || accountSub?.plan || "b2c_monthly",
          portoneCustomerUid: accountSub?.portoneCustomerUid || undefined,
          status: "pending_payment"
        }
      });
    }
    const row = await prisma.lineSubscription.findUnique({
      where: { id: ensured.id },
      include: LINE_INCLUDE
    });
    if (row) out.push(toDto(row, certifiedPhone));
  }
  return out;
}

/** 독립 회선(인증번호 계정 구독에 묶이지 않은 것) 정기 청구 */
export async function runIndependentLineBillingBatch(asOf = new Date(), dryRun = false) {
  const dayStart = new Date(asOf);
  const candidates = await prisma.lineSubscription.findMany({
    where: {
      status: "active",
      userSubscriptionId: null,
      portoneCustomerUid: { not: null },
      nextChargeAt: { lte: asOf }
    },
    select: { id: true, userId: true, nextChargeAt: true }
  });
  const summary = {
    scanned: candidates.length,
    succeeded: 0,
    failed: 0,
    skippedDryRun: 0,
    results: [] as Array<Record<string, unknown>>
  };
  void dayStart;
  if (dryRun) {
    summary.skippedDryRun = candidates.length;
    summary.results = candidates.map((c) => ({
      lineSubscriptionId: c.id,
      userId: c.userId,
      nextChargeAt: c.nextChargeAt?.toISOString(),
      dryRun: true
    }));
    return summary;
  }
  for (const row of candidates) {
    const result = await chargeLineSubscription(row.id, row.userId, asOf);
    if (result.ok) {
      summary.succeeded += 1;
      summary.results.push({
        lineSubscriptionId: row.id,
        userId: row.userId,
        merchantUid: result.merchantUid,
        ok: true
      });
    } else {
      summary.failed += 1;
      summary.results.push({
        lineSubscriptionId: row.id,
        userId: row.userId,
        error: result.error,
        ok: false
      });
    }
  }
  return summary;
}

export async function listOverdueLinesForAdmin(opts: { q?: string; limit?: number; offset?: number }) {
  const q = String(opts.q || "").trim();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const where: Prisma.LineSubscriptionWhereInput = {
    status: { in: ["grace", "lapsed"] },
    ...(q
      ? {
          OR: [
            { businessCard: { phoneE164: { contains: q } } },
            { businessCard: { displayName: { contains: q, mode: "insensitive" } } },
            { user: { legalName: { contains: q, mode: "insensitive" } } },
            { user: { publicHandle: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };
  const [rows, total] = await Promise.all([
    prisma.lineSubscription.findMany({
      where,
      include: {
        businessCard: { select: { phoneE164: true, displayName: true, kind: true } },
        user: { select: { id: true, legalName: true, publicHandle: true, email: true, phoneE164: true } }
      },
      orderBy: [{ status: "asc" }, { graceEndsAt: "asc" }, { updatedAt: "desc" }],
      take: limit,
      skip: offset
    }),
    prisma.lineSubscription.count({ where })
  ]);
  const asOf = new Date();
  return {
    total,
    limit,
    offset,
    lines: rows.map((row) => {
      const dto = toDto(row, row.user.phoneE164, asOf);
      return {
        ...dto,
        userId: row.user.id,
        legalName: row.user.legalName || "",
        publicHandle: row.user.publicHandle || "",
        email: row.user.email || ""
      };
    })
  };
}
