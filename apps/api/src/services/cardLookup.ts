import { prisma } from "../db/client.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";

function pickProfileString(profileJson: unknown, keys: string[]): string | null {
  if (!profileJson || typeof profileJson !== "object") return null;
  const o = profileJson as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** 번호 기준 조회 응답 본문 — GET /lookup · GET /by-number 공용 */
export async function lookupCardByRawNumber(raw: string) {
  const e164 = normalizeToE164KR(raw.trim());
  if (!e164) {
    return { status: 400 as const, body: { error: "유효한 번호 형식이 아닙니다.", matched: false } };
  }

  const card = await prisma.businessCard.findFirst({
    where: { phoneE164: e164, verificationStatus: "approved" },
    include: {
      user: { select: { id: true, legalName: true, publicHandle: true } }
    }
  });

  if (card) {
    const profile = (card.profileJson as Record<string, unknown> | null) ?? null;
    return {
      status: 200 as const,
      body: {
        matched: true,
        is_verified: card.verificationStatus === "approved",
        source: "business_card",
        cardId: card.id,
        kind: card.kind,
        displayName: card.displayName || card.user.legalName || "",
        jobTitle: card.jobTitle || "",
        companyName: card.companyName || "",
        profile,
        image_url: pickProfileString(profile, ["image_url", "imageUrl", "photo_url", "portrait_url"]),
        voice_url: pickProfileString(profile, ["voice_url", "voiceUrl", "bluevoice_url"]),
        phoneE164: card.phoneE164
      }
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      phoneE164: e164,
      OR: [{ identityVerified: true }, { digitalCard: { isNot: null } }]
    },
    include: { businessProfile: true, digitalCard: true }
  });

  if (user) {
    const tierSnap = String(user.digitalCard?.membershipTierSnapshot || "").toLowerCase();
    const isPremiumLine = ["paid", "premium", "b2b", "business"].includes(tierSnap);
    return {
      status: 200 as const,
      body: {
        matched: true,
        is_verified: Boolean(user.identityVerified) || Boolean(user.digitalCard),
        source: "user_mobile",
        userId: user.id,
        displayName: user.legalName || "",
        jobTitle: user.businessProfile?.jobTitle || "",
        companyName: user.businessProfile?.companyName || "",
        digitalCardActive: Boolean(user.digitalCard),
        is_premium_line: isPremiumLine,
        phoneE164: user.phoneE164,
        image_url: null as string | null,
        voice_url: null as string | null
      }
    };
  }

  return {
    status: 404 as const,
    body: { matched: false, message: "등록된 명함이 없습니다." }
  };
}
