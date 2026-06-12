import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  createDirectVideoUploadUrl,
  isDirectVideoStorageConfigured
} from "../services/media/directVideoStorage.js";

export const mediaRoutes = new Hono();

mediaRoutes.get("/video-upload/status", (c) => {
  return c.json({
    ok: true,
    configured: isDirectVideoStorageConfigured(),
    provider: "supabase"
  });
});

mediaRoutes.use("*", requireUserHeader);

/** POST — Presigned URL 발급 (파일 바이트는 API 서버를 거치지 않음) */
mediaRoutes.post("/video-upload-url", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      fileName?: string;
      contentType?: string;
      fileSize?: number;
    }>();

    const result = await createDirectVideoUploadUrl({
      userId,
      fileName: String(body?.fileName || "video.mp4"),
      contentType: String(body?.contentType || "video/mp4"),
      fileSize: Number(body?.fileSize) || 0
    });

    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const status = message.includes("설정되지 않") ? 503 : 400;
    return c.json({ ok: false, error: message }, status);
  }
});
