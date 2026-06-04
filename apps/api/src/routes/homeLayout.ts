import { Hono } from "hono";
import { getHomeLayout } from "../services/office/hqHomeLayoutService.js";

export const homeLayoutRoutes = new Hono();

homeLayoutRoutes.get("/layout", async (c) => {
  try {
    const layout = await getHomeLayout();
    return c.json({ ok: true, layout });
  } catch (e) {
    console.warn("[home-layout] get failed", e);
    return c.json({ ok: true, layout: null, degraded: true });
  }
});
