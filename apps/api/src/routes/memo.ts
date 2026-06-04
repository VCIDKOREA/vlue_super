import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  createPersonalMemo,
  deletePersonalMemo,
  fetchLinkPreview,
  fireMemoReminder,
  getMemoListMeta,
  getPersonalMemo,
  listPersonalMemos,
  markMemoRead,
  receiveShareMemo,
  searchPersonalMemos,
  summarizeMemoText,
  updatePersonalMemo
} from "../services/memo/personalMemoService.js";

export const memoRoutes = new Hono();

memoRoutes.use("*", requireUserHeader);

memoRoutes.get("/meta", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const meta = await getMemoListMeta(userId);
    return c.json({ ok: true, ...meta });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

memoRoutes.post("/", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<Record<string, unknown>>();
    const memo = await createPersonalMemo(userId, {
      type: (body.type as "text") || "text",
      content: String(body.content || ""),
      title: body.title ? String(body.title) : null,
      sourceApp: body.sourceApp ? String(body.sourceApp) : body.source_app ? String(body.source_app) : null,
      sourceUrl: body.sourceUrl ? String(body.sourceUrl) : body.source_url ? String(body.source_url) : null,
      thumbnailUrl: body.thumbnailUrl
        ? String(body.thumbnailUrl)
        : body.thumbnail_url
          ? String(body.thumbnail_url)
          : null,
      isPinned: Boolean(body.isPinned ?? body.is_pinned),
      isBookmarked: Boolean(body.isBookmarked ?? body.is_bookmarked),
      isUnread: Boolean(body.isUnread ?? body.is_unread),
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      bgColor: body.bgColor ? String(body.bgColor) : body.bg_color ? String(body.bg_color) : "white",
      aiSummary: body.aiSummary != null ? String(body.aiSummary) : null,
      reminderAt: body.reminderAt ? String(body.reminderAt) : body.reminder_at ? String(body.reminder_at) : null
    });
    return c.json({ ok: true, memo });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message.includes("required") ? 400 : 500);
  }
});

memoRoutes.get("/", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const memos = await listPersonalMemos(userId, {
      filter: c.req.query("filter") || "all",
      tag: c.req.query("tag") || undefined,
      sourceApp: c.req.query("sourceApp") || undefined,
      sort: c.req.query("sort") || undefined
    });
    return c.json({ ok: true, memos });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

memoRoutes.get("/search", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const memos = await searchPersonalMemos(userId, c.req.query("q") || "", {
      sourceApp: c.req.query("sourceApp") || undefined,
      from: c.req.query("from") || undefined,
      to: c.req.query("to") || undefined
    });
    return c.json({ ok: true, memos });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

memoRoutes.get("/link-preview", async (c) => {
  try {
    const url = c.req.query("url") || "";
    const preview = await fetchLinkPreview(url);
    return c.json({ ok: true, preview });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

memoRoutes.post("/share-receive", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<Record<string, unknown>>();
    const result = await receiveShareMemo(userId, {
      text: body.text ? String(body.text) : undefined,
      url: body.url ? String(body.url) : undefined,
      imageUrl: body.imageUrl ? String(body.imageUrl) : body.image_url ? String(body.image_url) : undefined,
      sourceApp: body.sourceApp ? String(body.sourceApp) : body.source_app ? String(body.source_app) : undefined,
      title: body.title ? String(body.title) : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      save: body.save !== false
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

memoRoutes.get("/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const memo = await getPersonalMemo(c.req.param("id"), userId);
    if (!memo) return c.json({ error: "NOT_FOUND" }, 404);
    await markMemoRead(c.req.param("id"), userId);
    return c.json({ ok: true, memo: { ...memo, isUnread: false } });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

memoRoutes.put("/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<Record<string, unknown>>();
    const memo = await updatePersonalMemo(c.req.param("id"), userId, {
      type: body.type as "text" | undefined,
      content: body.content != null ? String(body.content) : undefined,
      title: body.title !== undefined ? (body.title ? String(body.title) : null) : undefined,
      sourceApp: body.sourceApp !== undefined ? String(body.sourceApp || "") : undefined,
      sourceUrl: body.sourceUrl !== undefined ? String(body.sourceUrl || "") : undefined,
      thumbnailUrl: body.thumbnailUrl !== undefined ? String(body.thumbnailUrl || "") : undefined,
      isPinned: body.isPinned != null ? Boolean(body.isPinned) : undefined,
      isBookmarked: body.isBookmarked != null ? Boolean(body.isBookmarked) : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      bgColor: body.bgColor ? String(body.bgColor) : undefined,
      aiSummary: body.aiSummary !== undefined ? String(body.aiSummary || "") : undefined,
      reminderAt: body.reminderAt !== undefined ? String(body.reminderAt || "") : undefined
    });
    return c.json({ ok: true, memo });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message === "NOT_FOUND" ? 404 : 400);
  }
});

memoRoutes.delete("/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    await deletePersonalMemo(c.req.param("id"), userId);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

memoRoutes.post("/:id/reminder", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ reminderAt?: string; reminder_at?: string }>();
    const reminderAt = body.reminderAt || body.reminder_at || null;
    const memo = await updatePersonalMemo(c.req.param("id"), userId, { reminderAt });
    if (reminderAt && new Date(reminderAt).getTime() <= Date.now()) {
      await fireMemoReminder(userId, memo.id);
    }
    return c.json({ ok: true, memo });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message === "NOT_FOUND" ? 404 : 400);
  }
});
