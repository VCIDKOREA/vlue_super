/** 사용자별 SSE 연결에 이벤트 브로드캐스트 (§6 푸시 대체 · §8 소켓 대체) */

type Sink = (obj: Record<string, unknown>) => void;

const subscribers = new Map<string, Set<Sink>>();

export function sseSubscribe(userId: string, sink: Sink): () => void {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(sink);
  return () => {
    set.delete(sink);
    if (set.size === 0) subscribers.delete(userId);
  };
}

export function ssePublish(userId: string, event: Record<string, unknown>): void {
  const set = subscribers.get(userId);
  if (!set?.size) return;
  for (const sink of set) {
    try {
      sink(event);
    } catch {
      /* ignore broken stream */
    }
  }
}

/** 현재 SSE에 연결된 모든 클라이언트에 브로드캐스트 */
export function ssePublishAllConnected(event: Record<string, unknown>): number {
  let count = 0;
  for (const set of subscribers.values()) {
    for (const sink of set) {
      try {
        sink(event);
        count += 1;
      } catch {
        /* ignore broken stream */
      }
    }
  }
  return count;
}
