/**
 * Prisma 단일 인스턴스 — 개발 시 핫 리로드로 인한 연결 폭주 방지용 패턴은 추후 적용.
 * DATABASE_URL 은 루트 또는 apps/api/.env 에서 로드.
 */
import { PrismaClient } from "@vlue/db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
