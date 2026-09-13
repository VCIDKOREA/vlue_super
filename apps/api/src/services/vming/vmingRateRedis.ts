import { withRedis } from "../../lib/safeRedis.js";

type MemoryRow = { count: number; expiresAt: number };

const memory = new Map<string, MemoryRow>();

export async function getRateValue(key: string): Promise<number> {
  const fromRedis = await withRedis(async (redis) => {
    const v = await redis.get(key);
    return Number(v || 0);
  });
  if (fromRedis != null && !Number.isNaN(fromRedis)) return fromRedis;

  const row = memory.get(key);
  if (!row) return 0;
  if (Date.now() >= row.expiresAt) {
    memory.delete(key);
    return 0;
  }
  return row.count;
}

export async function incrRateValue(key: string, expiresAtMs: number, amount = 1): Promise<number> {
  const delta = Math.max(1, Math.floor(amount));
  const fromRedis = await withRedis(async (redis) => {
    const next = await redis.incrby(key, delta);
    await redis.pexpireat(key, expiresAtMs);
    return Number(next);
  });
  if (fromRedis != null && !Number.isNaN(fromRedis)) return fromRedis;

  const prev = await getRateValue(key);
  const next = prev + delta;
  memory.set(key, { count: next, expiresAt: expiresAtMs });
  return next;
}
