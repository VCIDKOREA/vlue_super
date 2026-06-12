import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  createExternalLiveSession,
  endLiveSession,
  getLiveSession,
  handleLiveRecordingWebhook
} from "../services/live/liveSessionService.js";
import { createLiveEndpoint, getEmbedMeta } from "../services/live/liveService.js";

export const liveRoutes = new Hono();

/** 비용 0원: 외부 플랫폼 임베드 메타 (인증 불필요) */
liveRoutes.get("/embed/:platform/:streamId", async (c) => {
  const meta = getEmbedMeta(c.req.param("platform"), c.req.param("streamId"));
  if (!meta) return c.json({ error: "stream not found" }, 404);
  return c.json({ ok: true, embed: meta });
});

/** 라이브 녹화 완료 웹훅 — CDN URL → Seller_VOD_Products 자동 등록 */
liveRoutes.post("/webhook/recording-complete", async (c) => {
  try {
    const body = await c.req.json<{
      sessionId?: string;
      videoUrl?: string;
      thumbUrl?: string | null;
      durationSec?: number | null;
      productTitle?: string | null;
      priceKrw?: number | null;
      secret?: string;
    }>();
    const result = await handleLiveRecordingWebhook({
      sessionId: String(body?.sessionId || ""),
      videoUrl: String(body?.videoUrl || ""),
      thumbUrl: body?.thumbUrl,
      durationSec: body?.durationSec,
      productTitle: body?.productTitle,
      priceKrw: body?.priceKrw,
      webhookSecret: body?.secret
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const status = message.includes("인증") ? 401 : 400;
    return c.json({ ok: false, error: message }, status);
  }
});

liveRoutes.use("*", requireUserHeader);

/** 레거시 RTMP 엔드포인트 (메타데이터만, 미디어 바이트 미보관) */
liveRoutes.post("/endpoints", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json<{ platform?: string }>().catch(() => ({}))) as { platform?: string };
    const endpoint = createLiveEndpoint(userId, String(body?.platform || "vlue"));
    return c.json({ ok: true, endpoint });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** 외부 라이브 스트림 URL 바인딩 (Instagram/TikTok/YouTube Live HLS·m3u8) */
liveRoutes.post("/sessions", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      title?: string;
      streamUrl?: string;
      platform?: string;
      aspectRatio?: string;
    }>();
    const session = await createExternalLiveSession({
      sellerUserId: userId,
      title: body?.title,
      streamUrl: String(body?.streamUrl || ""),
      platform: body?.platform,
      aspectRatio: body?.aspectRatio
    });
    return c.json({ ok: true, session });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ ok: false, error: message }, 400);
  }
});

liveRoutes.get("/sessions/:id", async (c) => {
  const session = await getLiveSession(c.req.param("id"));
  if (!session) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true, session });
});

liveRoutes.post("/sessions/:id/end", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const session = await endLiveSession(c.req.param("id"), userId);
    return c.json({ ok: true, session });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ ok: false, error: message }, 400);
  }
});
