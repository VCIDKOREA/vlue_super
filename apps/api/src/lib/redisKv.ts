type MemoryRow = { value: string; expiresAt: number };

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

function purgeMemory() {
  const now = Date.now();
  for (const [k, v] of memory) {
    if (v.expiresAt <= now) memory.delete(k);
  }
}

export async function kvGet(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const v = await redis.get(key);
      return v == null ? null : String(v);
    } catch {
      /* fallback */
    }
  }
  purgeMemory();
  const row = memory.get(key);
  if (!row) return null;
  if (Date.now() >= row.expiresAt) {
    memory.delete(key);
    return null;
  }
  return row.value;
}

export async function kvSetEx(key: string, value: string, ttlSec: number): Promise<void> {
  const ttl = Math.max(1, Math.floor(ttlSec));
  const redis = await getRedisClient();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      await redis.setex(key, ttl, value);
      return;
    } catch {
      /* fallback */
    }
  }
  memory.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

export async function kvDel(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      await redis.del(key);
    } catch {
      /* fallback */
    }
  }
  memory.delete(key);
}
