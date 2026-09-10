import { Hono } from "hono";
import { loadAndroidVersionConfig } from "../services/app/androidVersionConfig.js";

/** 공개 — 앱 시작 시 최신 버전 확인 */
export const appPublicRoutes = new Hono();

appPublicRoutes.get("/android-version", async (c) => {
  const cfg = await loadAndroidVersionConfig();
  return c.json({
    ok: true,
    platform: "android",
    packageName: "kr.vlue.app",
    latestVersionCode: cfg.latestVersionCode,
    latestVersionName: cfg.latestVersionName,
    message: cfg.message,
    store: {
      market: "market://details?id=kr.vlue.app",
      play: "https://play.google.com/store/apps/details?id=kr.vlue.app",
      galaxy: "https://apps.samsung.com/appquery/appDetail.as?appId=kr.vlue.app"
    }
  });
});
