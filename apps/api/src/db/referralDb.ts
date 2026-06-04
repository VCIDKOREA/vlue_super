import { prisma } from "./client.js";

/** 마이그레이션·prisma generate 전후 호환 — 레퍼럴 전용 모델 접근 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const referralDb = prisma as any;
