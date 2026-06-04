/**
 * 통화 웹훅 — destination → real_cli (TTL 30s)
 * REDIS_URL 미설정 시 프로세스 메모리 폴백
 */

type CacheEntry = { realCli: string; displayNumber: string; expiresAt: number };

const memory = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

function normDest(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

export async function setCallOverlayCache(payload: {
  destinationNumber: string;
  realCliNumber: string;
  displayNumber: string;
}): Promise<void> {
  const key = normDest(payload.destinationNumber);
  if (!key) return;

  memory.set(key, {
    realCli: payload.realCliNumber,
    displayNumber: payload.displayNumber,
    expiresAt: Date.now() + TTL_MS
  });
}

export async function getCallOverlayCache(destinationNumber: string): Promise<{
  realCliNumber: string | null;
  displayNumber: string | null;
}> {
  const key = normDest(destinationNumber);
  const hit = memory.get(key);
  if (!hit || hit.expiresAt < Date.now()) {
    memory.delete(key);
    return { realCliNumber: null, displayNumber: null };
  }
  return { realCliNumber: hit.realCli, displayNumber: hit.displayNumber };
}

/** 주기적 메모리 정리 */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memory.entries()) {
    if (v.expiresAt < now) memory.delete(k);
  }
}, 15_000).unref?.();
