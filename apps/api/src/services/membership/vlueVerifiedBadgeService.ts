import { prisma } from "../../db/client.js";
import { isPaidMember } from "./paidMemberGate.js";

const FREE_SHARE_MIN = 10;

const BADGE_FALLBACK = {
  vlueVerifiedBadge: false,
  showcaseShareCount: 0,
  freeEligible: false
};

function isMissingBadgeColumnError(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || "");
  return (
    msg.includes("vlue_verified_badge_at") ||
    msg.includes("showcase_share_count") ||
    msg.includes("P2022")
  );
}

type StyleJson = Record<string, unknown> | null;

function asStyle(raw: unknown): StyleJson {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function pickStyle(user: {
  showcaseLiveStyleJson: unknown;
  showcaseStyleJson: unknown;
}): StyleJson {
  return asStyle(user.showcaseLiveStyleJson) || asStyle(user.showcaseStyleJson);
}

function countShowcasePhotoPages(style: StyleJson): number {
  const pages = Array.isArray(style?.pages) ? style.pages : [];
  let n = 0;
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const gallery = (page as { gallery?: { photos?: unknown[] } }).gallery;
    const photos = Array.isArray(gallery?.photos) ? gallery.photos : [];
    if (photos.some((ph) => String((ph as { url?: string })?.url || ph || "").trim())) n += 1;
  }
  return n;
}

function styleHasBgm(style: StyleJson): boolean {
  const bgm = style?.bgm;
  if (!bgm || typeof bgm !== "object" || Array.isArray(bgm)) return false;
  const row = bgm as Record<string, unknown>;
  if (row.linkBroken === true) return false;
  const playlist = Array.isArray(row.playlist) ? row.playlist : [];
  if (
    playlist.some(
      (t) =>
        t &&
        typeof t === "object" &&
        String((t as { audioUrl?: string }).audioUrl || "").trim() &&
        (t as { linkBroken?: boolean }).linkBroken !== true
    )
  ) {
    return true;
  }
  const mode = String(row.mode || "").trim();
  if (!mode || mode === "none") return false;
  return Boolean(
    String(row.audioUrl || "").trim() ||
      String(row.soundId || "").trim() ||
      String(row.title || "").trim() ||
      String(row.presetId || "").trim()
  );
}

function isBroadcastOn(style: StyleJson): boolean {
  return style?.includeDigitalCard === true;
}

function isNamePublic(style: StyleJson): boolean {
  return style?.showBroadcastName !== false;
}

function isSearchPublicForFree(style: StyleJson): boolean {
  return String(style?.privacyMode || "").trim() === "public";
}

function isSearchPublicForPaid(user: {
  isNameSearchAllowed: boolean;
  isPhoneSearchAllowed: boolean;
  isOrgSearchAllowed: boolean;
  isIdSearchAllowed: boolean;
}): boolean {
  return (
    user.isNameSearchAllowed ||
    user.isPhoneSearchAllowed ||
    user.isOrgSearchAllowed ||
    user.isIdSearchAllowed
  );
}

export type VlueBadgeUserRow = {
  vlueVerifiedBadgeAt: Date | null;
  showcaseShareCount: number;
  showcaseStyleJson: unknown;
  showcaseLiveStyleJson: unknown;
  isNameSearchAllowed: boolean;
  isPhoneSearchAllowed: boolean;
  isOrgSearchAllowed: boolean;
  isIdSearchAllowed: boolean;
};

export function evaluateFreeVlueBadgeEligibility(user: VlueBadgeUserRow): boolean {
  const style = pickStyle(user);
  if (!style) return false;
  return (
    isNamePublic(style) &&
    isSearchPublicForFree(style) &&
    countShowcasePhotoPages(style) >= 1 &&
    styleHasBgm(style) &&
    isBroadcastOn(style) &&
    Number(user.showcaseShareCount || 0) >= FREE_SHARE_MIN
  );
}

export async function hasVlueVerifiedBadge(userId: string): Promise<boolean> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { vlueVerifiedBadgeAt: true }
    });
    if (row?.vlueVerifiedBadgeAt) return true;
    const evaluated = await evaluateAndGrantVlueVerifiedBadge(userId);
    return evaluated.granted || evaluated.already;
  } catch (err) {
    if (isMissingBadgeColumnError(err)) return false;
    throw err;
  }
}

export async function getVlueBadgeSnapshot(userId: string) {
  try {
  let row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      vlueVerifiedBadgeAt: true,
      showcaseShareCount: true,
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true,
      isNameSearchAllowed: true,
      isPhoneSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true
    }
  });
  if (!row) {
    return {
      vlueVerifiedBadge: false,
      showcaseShareCount: 0,
      freeEligible: false
    };
  }
  if (!row.vlueVerifiedBadgeAt) {
    await evaluateAndGrantVlueVerifiedBadge(userId);
    row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        vlueVerifiedBadgeAt: true,
        showcaseShareCount: true,
        showcaseStyleJson: true,
        showcaseLiveStyleJson: true,
        isNameSearchAllowed: true,
        isPhoneSearchAllowed: true,
        isOrgSearchAllowed: true,
        isIdSearchAllowed: true
      }
    });
    if (!row) {
      return {
        vlueVerifiedBadge: false,
        showcaseShareCount: 0,
        freeEligible: false
      };
    }
  }
  if (row.vlueVerifiedBadgeAt) {
    return {
      vlueVerifiedBadge: true,
      showcaseShareCount: row.showcaseShareCount,
      freeEligible: true
    };
  }
  const paid = await isPaidMember(userId);
  const freeEligible = paid.ok ? true : evaluateFreeVlueBadgeEligibility(row);
  return {
    vlueVerifiedBadge: false,
    showcaseShareCount: row.showcaseShareCount,
    freeEligible
  };
  } catch (err) {
    if (isMissingBadgeColumnError(err)) return { ...BADGE_FALLBACK };
    throw err;
  }
}

export async function evaluateAndGrantVlueVerifiedBadge(userId: string): Promise<{
  granted: boolean;
  already: boolean;
  eligible: boolean;
}> {
  try {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      vlueVerifiedBadgeAt: true,
      showcaseShareCount: true,
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true,
      isNameSearchAllowed: true,
      isPhoneSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true
    }
  });
  if (!row) return { granted: false, already: false, eligible: false };
  if (row.vlueVerifiedBadgeAt) return { granted: false, already: true, eligible: true };

  const paid = await isPaidMember(userId);
  if (paid.ok) {
    await prisma.user.update({
      where: { id: userId },
      data: { vlueVerifiedBadgeAt: new Date() }
    });
    return { granted: true, already: false, eligible: true };
  }

  const eligible = evaluateFreeVlueBadgeEligibility(row);
  if (!eligible) return { granted: false, already: false, eligible: false };

  await prisma.user.update({
    where: { id: userId },
    data: { vlueVerifiedBadgeAt: new Date() }
  });
  return { granted: true, already: false, eligible: true };
  } catch (err) {
    if (isMissingBadgeColumnError(err)) return { granted: false, already: false, eligible: false };
    throw err;
  }
}

/** 본인 쇼케이스 링크 공유(복사·카카오) 1회 기록 */
export async function recordSelfShowcaseShare(userId: string) {
  try {
  const row = await prisma.user.update({
    where: { id: userId },
    data: { showcaseShareCount: { increment: 1 } },
    select: {
      showcaseShareCount: true,
      vlueVerifiedBadgeAt: true,
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true,
      isNameSearchAllowed: true,
      isPhoneSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true
    }
  });
  let vlueVerifiedBadge = Boolean(row.vlueVerifiedBadgeAt);
  if (!vlueVerifiedBadge) {
    const granted = await evaluateAndGrantVlueVerifiedBadge(userId);
    vlueVerifiedBadge = granted.granted || granted.already;
  }
  return {
    showcaseShareCount: row.showcaseShareCount,
    vlueVerifiedBadge
  };
  } catch (err) {
    if (isMissingBadgeColumnError(err)) {
      return { showcaseShareCount: 0, vlueVerifiedBadge: false };
    }
    throw err;
  }
}
