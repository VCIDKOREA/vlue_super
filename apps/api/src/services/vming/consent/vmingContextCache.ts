/** 브이밍 방별 컨텍스트 캐시 (Redis 대체 인메모리) */

type StreamHandle = { aborted: boolean };

const contextQueue = new Map<string, unknown[]>();
const activeStreams = new Map<string, StreamHandle>();

export function getVmingContext(roomId: string) {
  return contextQueue.get(roomId);
}

export function setVmingContext(roomId: string, data: unknown[]) {
  contextQueue.set(roomId, data);
}

export async function flushVmingCache(roomId: string) {
  contextQueue.delete(roomId);
  const stream = activeStreams.get(roomId);
  if (stream) {
    stream.aborted = true;
    activeStreams.delete(roomId);
  }
  try {
    const { delRedisKeys } = await import("./vmingRedisShim.js");
    await delRedisKeys(roomId);
  } catch {
    /* optional redis */
  }
}

export function registerActiveStream(roomId: string): StreamHandle {
  const handle = { aborted: false };
  activeStreams.set(roomId, handle);
  return handle;
}

export function clearActiveStream(roomId: string) {
  activeStreams.delete(roomId);
}
