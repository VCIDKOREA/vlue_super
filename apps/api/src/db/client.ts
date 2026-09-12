/**
 * Prisma 단일 인스턴스 — Shared Pooler(PgBouncer)용 connection_limit=1 권장.
 * DATABASE_URL 은 루트 또는 apps/api/.env 에서 로드.
 */
import { PrismaClient } from "@vlue/db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Supabase Shared Pooler egress/연결 폭주 완화 — Prisma 프로세스당 풀 1 */
function withPoolerClientLimits(url: string | undefined): string | undefined {
  if (!url || typeof url !== "string") return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20");
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
