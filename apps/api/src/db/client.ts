/**
 * Prisma 단일 인스턴스 — Supabase Shared Pooler(PgBouncer)용.
 * DATABASE_URL 은 루트 또는 apps/api/.env 에서 로드.
 *
 * connection_limit=1 + pool_timeout=8 은 로그인까지 막힘
 * (Timed out fetching a new connection from the connection pool).
 * 프로세스당 소량 풀 + 충분한 대기시간으로 유지.
 */
import { PrismaClient } from "@vlue/db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function withPoolerClientLimits(url: string | undefined): string | undefined {
  if (!url || typeof url !== "string") return url;
  try {
    const u = new URL(url);
    const limit = Number(u.searchParams.get("connection_limit") || "0");
    /* 1은 백그라운드 작업과 로그인 경쟁 시 즉시 고갈 */
    if (!u.searchParams.has("connection_limit") || limit < 2) {
      u.searchParams.set("connection_limit", "5");
    }
    const poolTimeout = Number(u.searchParams.get("pool_timeout") || "0");
    if (!u.searchParams.has("pool_timeout") || poolTimeout < 15) {
      u.searchParams.set("pool_timeout", "20");
    }
    return u.toString();
  } catch {
    return url;
  }
}

const datasourceUrl = withPoolerClientLimits(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    datasourceUrl
      ? { datasources: { db: { url: datasourceUrl } } }
      : undefined
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
