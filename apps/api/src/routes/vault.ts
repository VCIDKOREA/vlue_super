import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  addVaultConnection,
  addVaultItem,
  listVaultConnections,
  listVaultItems
} from "../services/vault/vaultService.js";

export const vaultRoutes = new Hono();

vaultRoutes.use("*", requireUserHeader);

vaultRoutes.get("/items", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const items = await listVaultItems(userId);
    return c.json({ items, domain: "partnership-vault" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

vaultRoutes.post("/items", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ title?: string; kind?: string; payloadJson?: Record<string, unknown> }>();
    const title = String(body?.title || "").trim();
    if (!title) return c.json({ error: "title is required" }, 400);
    const created = await addVaultItem({ userId, title, kind: body?.kind, payloadJson: body?.payloadJson });
    return c.json({ ok: true, item: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

vaultRoutes.get("/connections", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const connections = await listVaultConnections(userId);
    return c.json({ connections });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

vaultRoutes.post("/connections", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ name?: string; kind?: string; payloadJson?: Record<string, unknown> }>();
    const name = String(body?.name || "").trim();
    if (!name) return c.json({ error: "name is required" }, 400);
    const created = await addVaultConnection({
      userId,
      name,
      kind: body?.kind,
      payloadJson: body?.payloadJson
    });
    return c.json({ ok: true, connection: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

