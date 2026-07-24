import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  createDirectVideoUploadUrl,
  isDirectVideoStorageConfigured
} from "../services/media/directVideoStorage.js";
import {
  createDirectImageUploadUrl,
  isDirectImageStorageConfigured,
  IMAGE_UPLOAD_KINDS
} from "../services/media/directImageStorage.js";

export const mediaRoutes = new Hono();

mediaRoutes.get("/video-upload/status", (c) => {
  const configured = isDirectVideoStorageConfigured();
  return c.json({
    ok: true,
    configured,
    provider: configured ? "cloudflare-r2" : null
  });
});

mediaRoutes.get("/image-upload/status", (c) => {
  const configured = isDirectImageStorageConfigured();
  return c.json({
    ok: true,
    configured,
    provider: configured ? "cloudflare-r2" : null,
    kinds: IMAGE_UPLOAD_KINDS,
    note: "파일 바이트는 API를 거치지 않습니다. Presigned URL로 R2에 직행 PUT 하세요."
  });
});

mediaRoutes.use("*", requireUserHeader);

/** POST — 영상 Presigned URL (파일 바이트는 API 서버를 거치지 않음) */
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

/**
 * POST — 이미지 Presigned URL만 발급
 * 클라이언트: 리사이즈·압축 → 이 URL로 PUT → publicUrl 저장
 * 서버: 파일 본문 수신 없음
 */
mediaRoutes.post("/image-upload-url", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      kind?: string;
      fileName?: string;
      contentType?: string;
      fileSize?: number;
    }>();

    if (!isDirectImageStorageConfigured()) {
      return c.json(
        {
          ok: false,
          configured: false,
          error: "이미지 스토리지(R2)가 설정되지 않았습니다."
        },
        503
      );
    }

    const result = await createDirectImageUploadUrl({
      userId,
      kind: String(body?.kind || "general"),
      fileName: String(body?.fileName || "image.jpg"),
      contentType: String(body?.contentType || "image/jpeg"),
      fileSize: Number(body?.fileSize) || 0
    });

    return c.json({ ok: true, configured: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const status = message.includes("설정되지 않") ? 503 : 400;
    return c.json({ ok: false, error: message, configured: isDirectImageStorageConfigured() }, status);
  }
});
