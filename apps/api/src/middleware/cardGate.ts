import type { BusinessCard } from "@prisma/client";
import type { Context, Next } from "hono";
import { prisma } from "../db/client.js";
import { resolveRequestUserId } from "../lib/authContext.js";

/** 스탠다드/프리미엄 — DigitalCard 발급 시 스냅샷 기준 (추가 필드 없이 .env 만으로 티어 조정 불가 → DB 스냅샷 사용) */
export async function userHasPremiumTier(userId: string): Promise<boolean> {
  const row = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { membershipTierSnapshot: true }
  });
  const t = row?.membershipTierSnapshot;
  return t === "paid" || t === "standard" || t === "premium" || t === "b2b";
}

/** 내선(extension)·대표(rep_number) 명함 — 카드 소유자가 프리미엄 티어인지 (DigitalCard 스냅샷) */
export async function userIsStrictPremium(userId: string): Promise<boolean> {
  const row = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { membershipTierSnapshot: true }
  });
  return row?.membershipTierSnapshot === "premium";
}

export type CardActor = "owner" | "member" | "none";

export async function cardActor(userId: string, cardId: string): Promise<CardActor> {
  const card = await prisma.businessCard.findUnique({ where: { id: cardId }, select: { userId: true } });
  if (!card) return "none";
  if (card.userId === userId) return "owner";
  const mem = await prisma.cardMember.findFirst({ where: { cardId, userId } });
  return mem ? "member" : "none";
}

/** Bearer JWT 우선, 비엄격 모드에서는 X-VLUE-User-Id 허용 → c.set("vlueUserId", id) */
export async function requireUserHeader(c: Context, next: Next) {
  const me = await resolveRequestUserId(c);
  if (!me) {
    return c.json({ error: "인증이 필요합니다. (Authorization: Bearer … 또는 X-VLUE-User-Id)" }, 401);
  }
  c.set("vlueUserId", me);
  await next();
}

/** 명함 확장(내선/대표) 등 — 유료 멤버십 필요 */
export async function requirePremiumTier(c: Context, next: Next) {
  const uid = c.get("vlueUserId") as string | undefined;
  if (!uid) return c.json({ error: "인증 필요" }, 401);
  const ok = await userHasPremiumTier(uid);
  if (!ok) {
    return c.json(
      {
        error: "스탠다드/프리미엄 멤버십이 필요합니다. (DigitalCard membershipTierSnapshot 기준)",
        code: "PREMIUM_REQUIRED"
      },
      403
    );
  }
  await next();
}

/** 경로 :cardId 에 대해 소유자 또는 카드 멤버 */
export async function requireCardOwnerOrMember(c: Context, next: Next) {
  const uid = c.get("vlueUserId") as string | undefined;
  const cardId = c.req.param("cardId");
  if (!uid || !cardId) return c.json({ error: "bad request" }, 400);
  const actor = await cardActor(uid, cardId);
  if (actor === "none") {
    return c.json({ error: "해당 명함에 대한 접근 권한이 없습니다.", code: "CARD_FORBIDDEN" }, 403);
  }
  c.set("cardActor", actor);
  await next();
}

/** 소유자만 */
export async function requireCardOwner(c: Context, next: Next) {
  const uid = c.get("vlueUserId") as string | undefined;
  const cardId = c.req.param("cardId");
  if (!uid || !cardId) return c.json({ error: "bad request" }, 400);
  const card = await prisma.businessCard.findUnique({ where: { id: cardId }, select: { userId: true } });
  if (!card) return c.json({ error: "카드 없음" }, 404);
  if (card.userId !== uid) {
    return c.json({ error: "명함 소유자(OWNER)만 가능합니다.", code: "OWNER_ONLY" }, 403);
  }
  await next();
}

/** 문의 알림: 소유자 또는 멤버(STAFF 포함) */
export async function requireCardNotifyAccess(c: Context, next: Next) {
  const uid = c.get("vlueUserId") as string | undefined;
  const cardId = c.req.param("cardId");
  if (!uid || !cardId) return c.json({ error: "bad request" }, 400);
  const actor = await cardActor(uid, cardId);
  if (actor === "none") {
    return c.json({ error: "해당 명함 멤버 또는 소유자만 알림을 보낼 수 있습니다.", code: "NOTIFY_FORBIDDEN" }, 403);
  }
  await next();
}

export type CardFeedWriteDenyReason =
  | "not_found"
  | "not_verified"
  | "forbidden"
  | "owner_not_premium";

/**
 * 피드 작성/삭제 — mobile: 소유자만(개인 피드). extension|rep_number: 소유자 프리미엄 필수 + 소유자 또는 MANAGER(또는 멤버 OWNER).
 */
export async function assertCardFeedWriteAccess(
  userId: string,
  cardId: string
): Promise<{ ok: true; card: BusinessCard } | { ok: false; reason: CardFeedWriteDenyReason }> {
  const card = await prisma.businessCard.findUnique({ where: { id: cardId } });
  if (!card) return { ok: false, reason: "not_found" };
  if (card.verificationStatus !== "approved") return { ok: false, reason: "not_verified" };

  if (card.kind === "mobile") {
    if (card.userId !== userId) return { ok: false, reason: "forbidden" };
    return { ok: true, card };
  }

  if (card.kind === "extension" || card.kind === "rep_number") {
    if (!(await userIsStrictPremium(card.userId))) {
      return { ok: false, reason: "owner_not_premium" };
    }
    if (card.userId === userId) return { ok: true, card };
    const mem = await prisma.cardMember.findFirst({ where: { cardId, userId } });
    if (mem && (mem.role === "MANAGER" || mem.role === "OWNER")) {
      return { ok: true, card };
    }
    return { ok: false, reason: "forbidden" };
  }

  return { ok: false, reason: "forbidden" };
}
