import { Hono } from "hono";
import type { ShowcaseSoundCreateType } from "@prisma/client";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  createShowcaseSoundUploadUrl,
  isShowcaseSoundStorageConfigured
} from "../services/showcase/showcaseSoundStorage.js";
import {
  borrowShowcaseSound,
  bumpThemeChangeQuota,
  createUserOriginalSound,
  getSoundForPlayback,
  getSoundQuotaStatus,
  listMySounds,
  listSignatureSounds,
  softDeleteUserOriginalSound,
  SOUND_RIGHTS_DISCLAIMER
} from "../services/showcase/showcaseSoundService.js";

export const showcaseSoundRoutes = new Hono();

const CREATE_TYPES = new Set<ShowcaseSoundCreateType>([
  "human_created",
  "ai_assisted",
  "ai_generated",
  "remake_arrangement"
]);

showcaseSoundRoutes.get("/meta", (c) =>
  c.json({
    ok: true,
    disclaimer: SOUND_RIGHTS_DISCLAIMER,
    createTypes: [
      { id: "human_created", label: "직접 창작한 음원" },
      { id: "ai_assisted", label: "AI를 활용해 제작한 음원" },
      { id: "ai_generated", label: "AI 생성 음원" },
      { id: "remake_arrangement", label: "리메이크·편곡 음원" }
    ],
    prohibited: [
      "특정 가수 목소리 무단 복제·모방",
      "기존 곡 무단 변형·입력",
      "상업적 이용 금지 요금제로 생성한 곡",
      "타인 가사·멜로디·음원 무단 사용"
    ],
    storageConfigured: isShowcaseSoundStorageConfigured()
  })
);

showcaseSoundRoutes.get("/signature", async (c) => {
  const items = await listSignatureSounds();
  return c.json({ ok: true, items, disclaimer: SOUND_RIGHTS_DISCLAIMER });
});

showcaseSoundRoutes.get("/quota", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const quota = await getSoundQuotaStatus(me);
  return c.json({ ok: true, quota });
});

showcaseSoundRoutes.get("/mine", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const data = await listMySounds(me);
  return c.json({ ok: true, ...data });
});

showcaseSoundRoutes.get("/upload/status", requireUserHeader, (c) =>
  c.json({ ok: true, configured: isShowcaseSoundStorageConfigured() })
);

showcaseSoundRoutes.post("/upload-url", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  try {
    const result = await createShowcaseSoundUploadUrl({
      userId: me,
      fileName: String(body.fileName || "sound.mp3"),
      contentType: String(body.contentType || "audio/mpeg"),
      fileSize: body.fileSize,
      prefix: "user"
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "upload_url_failed" }, 400);
  }
});

showcaseSoundRoutes.post("/", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = await c.req.json().catch(() => ({}));
  const createType = String(body.createType || "") as ShowcaseSoundCreateType;
  if (!CREATE_TYPES.has(createType)) {
    return c.json({ ok: false, error: "유효한 음원 유형을 선택해 주세요." }, 400);
  }
  try {
    const sound = await createUserOriginalSound(me, {
      title: String(body.title || ""),
      artistName: body.artistName,
      createType,
      audioUrl: String(body.audioUrl || ""),
      objectKey: body.objectKey,
      contentType: body.contentType,
      fileSize: body.fileSize,
      visibility: body.visibility === "public" ? "public" : "private",
      aiMeta: body.aiMeta && typeof body.aiMeta === "object" ? body.aiMeta : null,
      copyrightVerify:
        body.copyrightVerify && typeof body.copyrightVerify === "object" ? body.copyrightVerify : null,
      commercialUseClaimed: Boolean(body.commercialUseClaimed),
      rightsConsent: Boolean(body.rightsConsent)
    });
    return c.json({ ok: true, sound });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "register_failed" }, 400);
  }
});

showcaseSoundRoutes.post("/:soundId/borrow", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const soundId = String(c.req.param("soundId") || "").trim();
  try {
    const sound = await borrowShowcaseSound(me, soundId);
    return c.json({ ok: true, sound });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "borrow_failed" }, 400);
  }
});

showcaseSoundRoutes.delete("/:soundId", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const soundId = String(c.req.param("soundId") || "").trim();
  try {
    const sound = await softDeleteUserOriginalSound(me, soundId);
    return c.json({ ok: true, sound });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "delete_failed" }, 400);
  }
});

showcaseSoundRoutes.post("/theme-change", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  try {
    await bumpThemeChangeQuota(me);
    const quota = await getSoundQuotaStatus(me);
    return c.json({ ok: true, quota });
  } catch (e) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "theme_change_denied" }, 403);
  }
});

showcaseSoundRoutes.get("/:soundId", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const soundId = String(c.req.param("soundId") || "").trim();
  const result = await getSoundForPlayback(soundId, me);
  if (!result.ok) {
    return c.json(
      {
        ok: false,
        linkBroken: true,
        sound: result.sound,
        message: "원본 음원이 비공개·삭제되어 연결이 끊어졌습니다."
      },
      404
    );
  }
  return c.json({ ok: true, sound: result.sound });
});
