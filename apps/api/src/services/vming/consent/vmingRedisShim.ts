/** Redis 키 네임스페이스 (인메모리 폴백 — REDIS_URL 연동 시 확장) */

const memoryRedis = new Map<string, string>();

export async function delRedisKeys(roomId: string) {
  for (const key of [`vming:context:${roomId}`, `vming:summary:${roomId}`, `vming:session:${roomId}`]) {
    memoryRedis.delete(key);
  }
}

export function setRedisMemory(key: string, value: string) {
  memoryRedis.set(key, value);
}
