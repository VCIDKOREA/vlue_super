import { prisma } from "../../db/client.js";
import { hasOfficialCyanBadge } from "./badgePolicyManager.js";

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

export async function hasVlueVerifiedBadge(userId: string): Promise<boolean> {
  try {
    const evaluated = await evaluateAndGrantVlueVerifiedBadge(userId);
    return evaluated.eligible;
  } catch (err) {
    if (isMissingBadgeColumnError(err)) return false;
    throw err;
  }
}

export async function getVlueBadgeSnapshot(userId: string) {
  try {
    await evaluateAndGrantVlueVerifiedBadge(userId);
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        vlueVerifiedBadgeAt: true,
        showcaseShareCount: true
      }
    });
    if (!row) {
      return {
        vlueVerifiedBadge: false,
        showcaseShareCount: 0,
        freeEligible: false
      };
    }
    return {
      vlueVerifiedBadge: Boolean(row.vlueVerifiedBadgeAt),
      showcaseShareCount: row.showcaseShareCount,
      freeEligible: false
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
  revoked: boolean;
}> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { vlueVerifiedBadgeAt: true }
    });
    if (!row) return { granted: false, already: false, eligible: false, revoked: false };

    const eligible = await hasOfficialCyanBadge(userId);
    if (eligible && !row.vlueVerifiedBadgeAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { vlueVerifiedBadgeAt: new Date() }
      });
      return { granted: true, already: false, eligible: true, revoked: false };
    }
    if (!eligible && row.vlueVerifiedBadgeAt) {
      /* 구독 해지·가족플랜 탈퇴 즉시 회수 가능한 현재 상태로 동기화 */
      await prisma.user.update({
        where: { id: userId },
        data: { vlueVerifiedBadgeAt: null }
      });
      return { granted: false, already: false, eligible: false, revoked: true };
    }
    return {
      granted: false,
      already: eligible && Boolean(row.vlueVerifiedBadgeAt),
      eligible,
      revoked: false
    };
  } catch (err) {
    if (isMissingBadgeColumnError(err)) {
      return { granted: false, already: false, eligible: false, revoked: false };
    }
    throw err;
  }
}

/** 본인 쇼케이스 링크 공유 횟수만 기록한다. 무료 배지 승급 조건으로는 사용하지 않는다. */
export async function recordSelfShowcaseShare(userId: string) {
  try {
    const row = await prisma.user.update({
      where: { id: userId },
      data: { showcaseShareCount: { increment: 1 } },
      select: { showcaseShareCount: true }
    });
    const synced = await evaluateAndGrantVlueVerifiedBadge(userId);
    return {
      showcaseShareCount: row.showcaseShareCount,
      vlueVerifiedBadge: synced.eligible
    };
  } catch (err) {
    if (isMissingBadgeColumnError(err)) {
      return { showcaseShareCount: 0, vlueVerifiedBadge: false };
    }
    throw err;
  }
}
