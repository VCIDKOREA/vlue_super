type MemoryRow = { count: number; expiresAt: number };

const memory = new Map<string, MemoryRow>();
let redisClient: any = null;
let redisImportTried = false;

async function getRedisClient() {
  if (redisClient) return redisClient;
  if (redisImportTried) return null;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  redisImportTried = true;
  try {
    const mod = await import("ioredis");
    const RedisCtor = (mod as any).default || mod;
    redisClient = new RedisCtor(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
  } catch {
    redisClient = null;
  }
  return redisClient;
}

export async function getRateValue(key: string): Promise<number> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const v = await redis.get(key);
      return Number(v || 0);
    } catch {
      /* fallback */
    }
  }
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
  const redis = await getRedisClient();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const next = await redis.incrby(key, delta);
      await redis.pexpireat(key, expiresAtMs);
      return next;
    } catch {
      /* fallback */
    }
  }
  const prev = await getRateValue(key);
  const next = prev + delta;
  memory.set(key, { count: next, expiresAt: expiresAtMs });
  return next;
}
