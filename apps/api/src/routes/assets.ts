import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { getAssetById, uploadScanAsset } from "../services/assets/assetService.js";

export const assetsRoutes = new Hono();
assetsRoutes.use("*", requireUserHeader);

assetsRoutes.post("/scan-upload", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      fileName?: string;
      contentType?: string;
      contentBase64?: string;
    }>();
    const fileName = String(body?.fileName || "scan-file.bin");
    const contentType = String(body?.contentType || "application/octet-stream");
    const contentBase64 = String(body?.contentBase64 || "");
    if (!contentBase64) return c.json({ error: "contentBase64 is required" }, 400);
    const asset = await uploadScanAsset({ userId, fileName, contentType, contentBase64 });
    return c.json({ ok: true, asset });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

assetsRoutes.get("/:assetId", async (c) => {
  const asset = getAssetById(c.req.param("assetId"));
  if (!asset) return c.json({ error: "asset not found" }, 404);
  return c.json({ ok: true, asset });
});

assetsRoutes.get("/mock/:key", async (c) => {
  return c.json({
    ok: true,
    key: c.req.param("key"),
    storage: "mock",
    note: "mock storage endpoint for local test only"
  });
});

