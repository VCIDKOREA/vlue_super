/**
 * V1 쇼케이스 검색 안티어뷰징 — 분당 쿼터 + 반복 초과 시 계정 잠금·관리자 경보
 */
import { prisma } from "../../db/client.js";

const WINDOW_MS = 60_000;
/** 동일 계정 1분당 검색 임계치 */
export const SEARCH_RATE_LIMIT_PER_MINUTE = 10;
/** 1시간 내 429 스트라이크 한도 — 초과 시 suspended */
const STRIKE_WINDOW_MS = 60 * 60_000;
const STRIKE_LOCK_THRESHOLD = 3;

type Bucket = { timestamps: number[]; strikes: { at: number }[] };

const buckets = new Map<string, Bucket>();

function getBucket(userId: string): Bucket {
  let b = buckets.get(userId);
  if (!b) {
    b = { timestamps: [], strikes: [] };
    buckets.set(userId, b);
  }
  return b;
}

export type RateLimitResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      meta?: { retryAfterSec?: number; suspended?: boolean };
    };

/**
 * 슬라이딩 윈도우 레이트 리밋. 반복 초과 시 accountStatus=suspended + SecuritySearchAlert.
 */
export async function assertSearchRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const b = getBucket(userId);
  b.timestamps = b.timestamps.filter((t) => now - t < WINDOW_MS);
  b.strikes = b.strikes.filter((s) => now - s.at < STRIKE_WINDOW_MS);

  if (b.timestamps.length >= SEARCH_RATE_LIMIT_PER_MINUTE) {
    b.strikes.push({ at: now });
    const retryAfterSec = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - (b.timestamps[0] || now))) / 1000)
    );

    await prisma.securitySearchAlert.create({
      data: {
        userId,
        alertType: "RATE_LIMIT_BURST",
        severity: "medium",
        message: `쇼케이스 검색 분당 ${SEARCH_RATE_LIMIT_PER_MINUTE}회 초과`,
        metaJson: {
          count: b.timestamps.length,
          limit: SEARCH_RATE_LIMIT_PER_MINUTE,
          strikes: b.strikes.length
        }
      }
    }).catch(() => undefined);

    if (b.strikes.length >= STRIKE_LOCK_THRESHOLD) {
      await suspendAccountForSearchAbuse(userId, b.strikes.length);
      return {
        ok: false,
        error: "비정상 대량 검색이 감지되어 계정이 잠겼습니다.",
        meta: { suspended: true, retryAfterSec }
      };
    }

    await prisma.user
      .update({
        where: { id: userId },
        data: { searchAbuseStrikeCount: { increment: 1 } }
      })
      .catch(() => undefined);

    return {
      ok: false,
      error: `검색 요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도해 주세요.`,
      meta: { retryAfterSec }
    };
  }

  b.timestamps.push(now);
  return { ok: true };
}

async function suspendAccountForSearchAbuse(userId: string, strikeCount: number) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "suspended",
        searchSuspendedAt: new Date(),
        searchAbuseStrikeCount: { increment: 1 }
      }
    }),
    prisma.securitySearchAlert.create({
      data: {
        userId,
        alertType: "ACCOUNT_SUSPENDED",
        severity: "critical",
        message: "쇼케이스 검색 어뷰징으로 계정 잠금",
        metaJson: { strikeCount, reason: "search_rate_abuse" }
      }
    })
  ]).catch(() => undefined);
}

/** 테스트·운영 관측용 버킷 초기화 */
export function __resetSearchRateLimiterForTests() {
  buckets.clear();
}
