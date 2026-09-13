/**
 * REDIS_URL 이 죽거나 DNS 실패(ENOTFOUND)여도 API가 멈추지 않게.
 * 첫 실패 후 프로세스 수명 동안 인메모리 폴백만 사용.
 */

let redisClient: any = null;
let redisDisabled = false;
let redisImportTried = false;

function disableRedis(reason: string) {
  if (!redisDisabled) {
    console.warn(`[redis] disabled — ${reason}. Falling back to in-memory KV.`);
  }
  redisDisabled = true;
  const client = redisClient;
  redisClient = null;
  if (client) {
    try {
      client.removeAllListeners?.();
      client.disconnect?.();
    } catch {
      /* ignore */
    }
  }
}

export async function getSafeRedisClient(): Promise<any | null> {
  if (redisDisabled) return null;
  if (redisClient) {
    const st = String(redisClient.status || "");
    if (st === "end" || st === "close") {
      disableRedis(`status=${st}`);
      return null;
    }
    return redisClient;
  }
  if (redisImportTried) return null;

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    redisDisabled = true;
    return null;
  }

  redisImportTried = true;
  try {
    const mod = await import("ioredis");
    const RedisCtor = (mod as any).default || mod;
    const client = new RedisCtor(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1500,
      /* ENOTFOUND 등으로 재연결 루프·로그 스팸 금지 */
      retryStrategy: () => null,
      reconnectOnError: () => false
    });
    client.on("error", (err: Error) => {
      disableRedis(err?.message || "error event");
    });
    client.on("end", () => {
      disableRedis("connection ended");
    });
    redisClient = client;
    return client;
  } catch (e) {
    disableRedis(e instanceof Error ? e.message : "import/create failed");
    return null;
  }
}

/** Redis 연산 — 실패/타임아웃 시 null (호출측 메모리 폴백) */
export async function withRedis<T>(fn: (redis: any) => Promise<T>, timeoutMs = 1500): Promise<T | null> {
  const redis = await getSafeRedisClient();
  if (!redis) return null;
  try {
    if (redis.status !== "ready") {
      await Promise.race([
        redis.connect(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("redis connect timeout")), timeoutMs);
        })
      ]);
    }
    return await Promise.race([
      fn(redis),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("redis op timeout")), timeoutMs);
      })
    ]);
  } catch (e) {
    disableRedis(e instanceof Error ? e.message : "op failed");
    return null;
  }
}
