import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { createLocalAd, listLocalAds } from "../services/ads/localAdService.js";

export const adsRoutes = new Hono();

/** 홈 핫플레이스 — 등록된 지역 광고 목록 (공개 조회) */
adsRoutes.get("/", async (c) => {
  try {
    return c.json(await listLocalAds());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const schemaHint =
      msg.includes("local_ads") || msg.includes("does not exist") || msg.includes("LocalAd");
    if (schemaHint) {
      return c.json(
        {
          error: "지역 광고 DB가 준비되지 않았습니다. prisma migrate deploy 후 API를 재시작해 주세요.",
          code: "ADS_SCHEMA_NOT_READY",
          ads: []
        },
        503
      );
    }
    return c.json({ error: msg, ads: [] }, 500);
  }
});

/** 지역 광고 등록 — 유료 회원 전용 */
adsRoutes.post("/", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      feedPostId?: string;
      feedPostSource?: string;
      storeName?: string;
      description?: string;
      location?: string;
      imageUrl?: string | null;
    }>();
    const result = await createLocalAd(uid, body);
    if ("error" in result && result.error) {
      const status = result.code === "ADS_PAID_ONLY" ? 403 : 400;
      return c.json({ error: result.error, code: result.code }, status);
    }
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "ADS_CREATE_FAILED" }, 500);
  }
});
