import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { resolveB2bLineDisplay } from "../../lib/b2bLineDisplay.js";
import { getCallOverlayCache } from "./callCache.js";

export type OverlayMatchResult = {
  matched: boolean;
  displayNumber: string;
  profile: {
    assigneeName: string;
    assigneeTitle: string | null;
    companyName: string;
    companyLogoUrl: string | null;
  } | null;
  /** 실제 유선 번호 — 클라이언트 노출 금지 */
  realCliHidden: boolean;
};

/**
 * 소비자 단말 — display(1588) 수신 시 Redis → cart line → 명함
 * UI에는 display_number만, real_cli는 hidden
 */
export async function matchOverlayForDestination(
  destinationRaw: string,
  incomingDisplayRaw?: string
): Promise<OverlayMatchResult> {
  const cache = await getCallOverlayCache(destinationRaw);
  const displayNumber =
    incomingDisplayRaw?.trim() ||
    cache.displayNumber ||
    destinationRaw;

  let realCli = cache.realCliNumber;
  if (!realCli) {
    const e164Dest = normalizeToE164KR(destinationRaw);
    if (e164Dest) realCli = e164Dest;
  }

  if (!realCli) {
    return { matched: false, displayNumber, profile: null, realCliHidden: true };
  }

  const realE164 = normalizeToE164KR(realCli);
  if (!realE164) {
    return { matched: false, displayNumber, profile: null, realCliHidden: true };
  }

  const cartLine = await prisma.b2BCartLine.findFirst({
    where: { realCliPhoneE164: realE164 },
    include: {
      enterprise: { select: { companyName: true, masterDisplayNumber: true } },
      businessCard: {
        select: {
          displayName: true,
          jobTitle: true,
          companyName: true,
          profileJson: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!cartLine) {
    const card = await prisma.businessCard.findFirst({
      where: { phoneE164: realE164, verificationStatus: "approved" },
      select: {
        phoneE164: true,
        displayName: true,
        jobTitle: true,
        companyName: true,
        profileJson: true,
        b2bEnterprise: { select: { companyName: true, masterDisplayNumber: true } }
      }
    });

    if (!card) {
      return { matched: false, displayNumber, profile: null, realCliHidden: true };
    }

    const ent = card.b2bEnterprise;
    const pj = (card.profileJson as Record<string, unknown> | null) ?? {};
    const useRep =
      typeof pj.useMasterDisplayNumber === "boolean"
        ? pj.useMasterDisplayNumber
        : Boolean(pj.maskedDisplayOnly);
    const resolved = ent
      ? resolveB2bLineDisplay(ent, {
          useMasterDisplayNumber: useRep,
          realCliPhoneE164: card.phoneE164
        })
      : {
          displayNumber:
            (typeof pj.displayNumber === "string" && pj.displayNumber) || displayNumber,
          maskedDisplayOnly: pj.maskedDisplayOnly !== false
        };
    return {
      matched: true,
      displayNumber: resolved.displayNumber,
      profile: {
        assigneeName: card.displayName || "담당자",
        assigneeTitle: card.jobTitle,
        companyName: card.companyName || ent?.companyName || "",
        companyLogoUrl: typeof pj.logoUrl === "string" ? pj.logoUrl : null
      },
      realCliHidden: resolved.maskedDisplayOnly
    };
  }

  const ent = cartLine.enterprise;
  const card = cartLine.businessCard;
  const pj = (card?.profileJson as Record<string, unknown> | null) ?? {};
  const resolved = resolveB2bLineDisplay(ent, cartLine);

  return {
    matched: true,
    displayNumber: resolved.displayNumber,
    profile: {
      assigneeName: cartLine.assigneeName || card?.displayName || "담당자",
      assigneeTitle: cartLine.assigneeTitle || card?.jobTitle || null,
      companyName: ent.companyName || card?.companyName || "",
      companyLogoUrl: typeof pj.logoUrl === "string" ? pj.logoUrl : null
    },
    realCliHidden: resolved.maskedDisplayOnly
  };
}
