import { Hono } from "hono";
import { requireRequestUserId } from "../lib/authContext.js";
import { sseSubscribe } from "../realtime/sseHub.js";

export const realtimeRoutes = new Hono();

/**
 * GET /api/realtime/sse
 * Authorization: Bearer <accessToken>
 */
realtimeRoutes.get("/sse", async (c) => {
  const userId = await requireRequestUserId(c);
  if (!userId) {
    return c.json({ error: "인증이 필요합니다." }, 401);
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      send({ type: "vlue-sse-connected", at: new Date().toISOString() });
      unsubscribe = sseSubscribe(userId, send);
      ping = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
      }, 25000);

      const stop = () => {
        if (ping) {
          clearInterval(ping);
          ping = null;
        }
        unsubscribe?.();
        unsubscribe = null;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };
      c.req.raw.signal.addEventListener("abort", stop);
    },
    cancel() {
      if (ping) clearInterval(ping);
      unsubscribe?.();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
});
