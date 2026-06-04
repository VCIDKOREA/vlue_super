/**
 * VLUE 실시간 채널 (SSE) — §8 권한 회수 · §6 문의 알림 · 채팅 DM 푸시
 * EventSource 는 Authorization 헤더를 지원하지 않아 fetch 스트리밍으로 수신
 */

import { apiUrl } from "./apiBase.js";
import { getAccessToken, getRefreshToken, setVlueSessionTokens } from "./vlueAuthHeaders.js";

export const VLUE_SSE_CHAT_MESSAGE = "vlue-chat-message";
export const VLUE_SSE_APP_EVENT = "vlue-sse-app-event";

function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new Error("aborted"));
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

async function tryRefreshOnce(abortSignal) {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
      signal: abortSignal
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.accessToken) return false;
    setVlueSessionTokens({ accessToken: j.accessToken, refreshToken: j.refreshToken || rt });
    return true;
  } catch {
    return false;
  }
}

export function startVlueSse(_userId, { onEvent, onError } = {}) {
  if (typeof fetch === "undefined" || typeof TextDecoder === "undefined") return () => {};
  const base = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const path = "/api/realtime/sse";
  /** Vite 프록시 동일 오리진 시 상대 경로(VITE_API_URL 비움)가 안정적 */
  const url = base ? `${base}${path}`.replace(/([^:]\/)\/+/g, "$1/") : path;
  const abort = new AbortController();
  let stopped = false;

  (async () => {
    let backoffMs = 800;
    while (!stopped) {
      try {
        let token = getAccessToken();
        if (!token) {
          // 토큰이 없으면 재연결 의미 없음
          onError?.();
          return;
        }

        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: abort.signal
        });

        if (res.status === 401) {
          const refreshed = await tryRefreshOnce(abort.signal);
          if (!refreshed) {
            onError?.();
            return;
          }
          token = getAccessToken();
          if (!token) {
            onError?.();
            return;
          }
          // 즉시 재시도
          continue;
        }

        if (!res.ok || !res.body) throw new Error("sse_connect_failed");

        // 연결 성공 시 backoff reset
        backoffMs = 800;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const lines = chunk.split("\n");
            const dataLines = lines
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());
            if (!dataLines.length) continue;
            try {
              const data = JSON.parse(dataLines.join("\n"));
              onEvent?.(data);
              try {
                window.dispatchEvent(new CustomEvent(VLUE_SSE_APP_EVENT, { detail: data }));
              } catch {
                /* ignore */
              }
            } catch {
              /* ignore */
            }
          }
        }

        // 서버가 끊으면 재연결 시도
        if (stopped) return;
        await sleep(backoffMs, abort.signal);
        backoffMs = Math.min(30000, Math.floor(backoffMs * 1.7));
      } catch (e) {
        if (stopped) return;
        // abort 된 경우는 조용히 종료
        if (e instanceof Error && e.message === "aborted") return;
        onError?.();
        try {
          await sleep(backoffMs, abort.signal);
        } catch {
          return;
        }
        backoffMs = Math.min(30000, Math.floor(backoffMs * 1.7));
      }
    }
  })();

  return () => {
    stopped = true;
    try {
      abort.abort();
    } catch {
      /* ignore */
    }
  };
}

/** ChatRoom 등 컴포넌트에서 SSE 이벤트 구독 */
export function subscribeVlueSseAppEvents(handler) {
  if (typeof window === "undefined") return () => {};
  const onEv = (ev) => handler?.(ev?.detail || {});
  window.addEventListener(VLUE_SSE_APP_EVENT, onEv);
  return () => window.removeEventListener(VLUE_SSE_APP_EVENT, onEv);
}
