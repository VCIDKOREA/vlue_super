import { Hono } from "hono";
import { matchOverlayForDestination } from "../services/overlay/match.js";

export const overlayRoutes = new Hono();

/** GET/POST /api/v1/overlay/match */
overlayRoutes.get("/match", async (c) => {
  const destination = String(c.req.query("destination") ?? c.req.query("destination_number") ?? "");
  const display = String(c.req.query("display") ?? c.req.query("display_number") ?? "");
  const result = await matchOverlayForDestination(destination, display || undefined);
  return c.json(result);
});

overlayRoutes.post("/match", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    destination_number?: string;
    destinationNumber?: string;
    display_number?: string;
    displayNumber?: string;
  };
  const destination = String(
    body.destination_number || body.destinationNumber || ""
  );
  const display = String(body.display_number || body.displayNumber || "");
  const result = await matchOverlayForDestination(destination, display || undefined);
  return c.json(result);
});
