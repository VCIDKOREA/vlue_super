/**
 * REDIS_URL 이 죽거나 DNS 실패(ENOTFOUND)여도 API가 멈추지 않게.
 * 첫 실패 후 프로세스 수명 동안 인메모리 폴백만 사용.
 */

let redisClient: any = null;
let redisDisabled = false;
let redisImportTried = false;

/** 확인된 죽은/플레이스홀더 호스트 — 연결 시도 자체를 하지 않음 */
const BLOCKED_REDIS_HOSTS = [
  "amazed-elf-114297.upstash.io",
  "redis.vlue.kr"
];

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

/** 부팅 시 호출 — 죽은 Upstash URL 이면 connect 루프 자체를 막음 */
export function initRedisFromEnv(): void {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    redisDisabled = true;
    return;
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (BLOCKED_REDIS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      disableRedis(`blocked REDIS_URL host: ${host}`);
      return;
    }
    if (/upstash\.io$/i.test(host) && /amazed-elf/i.test(host)) {
      disableRedis(`blocked dead upstash host: ${host}`);
    }
  } catch {
    disableRedis("invalid REDIS_URL");
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

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (BLOCKED_REDIS_HOSTS.some((h) => host === h)) {
      disableRedis(`blocked REDIS_URL host: ${host}`);
      return null;
    }
  } catch {
    disableRedis("invalid REDIS_URL");
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
      connectTimeout: 1200,
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
export async function withRedis<T>(fn: (redis: any) => Promise<T>, timeoutMs = 1200): Promise<T | null> {
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
