import { withRedis } from "./safeRedis.js";

type MemoryRow = { value: string; expiresAt: number };

const memory = new Map<string, MemoryRow>();

function purgeMemory() {
  const now = Date.now();
  for (const [k, v] of memory) {
    if (v.expiresAt <= now) memory.delete(k);
  }
}

export async function kvGet(key: string): Promise<string | null> {
  const fromRedis = await withRedis(async (redis) => {
    const v = await redis.get(key);
    return v == null ? null : String(v);
  });
  if (fromRedis !== null) return fromRedis;

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
  const ok = await withRedis(async (redis) => {
    await redis.setex(key, ttl, value);
    return true;
  });
  if (ok) return;
  memory.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

export async function kvDel(key: string): Promise<void> {
  await withRedis(async (redis) => {
    await redis.del(key);
    return true;
  });
  memory.delete(key);
}
