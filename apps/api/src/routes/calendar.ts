import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventDetail,
  listCalendarEvents,
  setEventRsvp,
  updateCalendarEvent
} from "../services/calendar/vlueCalendarService.js";
import { enqueueFcmPush } from "../services/office/fcmPushQueue.js";
import { parseCalendarNaturalLanguage } from "../services/calendar/calendarParseService.js";

export const calendarRoutes = new Hono();

calendarRoutes.use("*", requireUserHeader);

calendarRoutes.post("/personal", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<Record<string, unknown>>();
    const event = await createCalendarEvent({
      authorUserId: userId,
      type: "personal",
      title: String(body.title || "").trim(),
      content: body.content ? String(body.content) : undefined,
      location: body.location ? String(body.location) : undefined,
      startAt: String(body.startAt || body.start_at || ""),
      endAt: String(body.endAt || body.end_at || ""),
      isAllDay: Boolean(body.isAllDay ?? body.is_all_day),
      color: body.color ? String(body.color) : undefined,
      pushEnabled: body.pushEnabled !== false,
      pushBeforeMinutes: Number(body.pushBeforeMinutes ?? body.push_before_minutes) || 30,
      repeatType: (body.repeatType || body.repeat_type || "none") as "none" | "daily" | "weekly" | "monthly",
      repeatEndDate: body.repeatEndDate ? String(body.repeatEndDate) : null
    });
    return c.json({ ok: true, event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const code = message.includes("required") || message.includes("INSERT") ? 400 : 403;
    return c.json({ error: message }, code);
  }
});

calendarRoutes.get("/personal", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const from = c.req.query("from") || undefined;
    const to = c.req.query("to") || undefined;
    const events = await listCalendarEvents({ userId, type: "personal", from, to });
    return c.json({ ok: true, events });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

calendarRoutes.put("/personal/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>();
    const event = await updateCalendarEvent(id, userId, {
      title: body.title ? String(body.title) : undefined,
      content: body.content != null ? String(body.content) : undefined,
      location: body.location != null ? String(body.location) : undefined,
      startAt: body.startAt ? String(body.startAt) : undefined,
      endAt: body.endAt ? String(body.endAt) : undefined,
      isAllDay: body.isAllDay != null ? Boolean(body.isAllDay) : undefined,
      color: body.color ? String(body.color) : undefined,
      pushEnabled: body.pushEnabled != null ? Boolean(body.pushEnabled) : undefined,
      pushBeforeMinutes:
        body.pushBeforeMinutes != null ? Number(body.pushBeforeMinutes) : undefined,
      repeatType: body.repeatType as "none" | "daily" | "weekly" | "monthly" | undefined,
      repeatEndDate: body.repeatEndDate != null ? String(body.repeatEndDate) : undefined
    });
    return c.json({ ok: true, event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message.includes("FORBIDDEN") ? 403 : 400);
  }
});

calendarRoutes.delete("/personal/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    await deleteCalendarEvent(c.req.param("id"), userId);
    return c.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message.includes("FORBIDDEN") ? 403 : 400);
  }
});

calendarRoutes.post("/group/:groupId", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const groupId = c.req.param("groupId");
    const body = await c.req.json<Record<string, unknown>>();
    const title = String(body.title || "").trim();
    const startAt = String(body.startAt || body.start_at || "");
    const endAt = String(body.endAt || body.end_at || "");
    if (!title || !startAt || !endAt) {
      return c.json({ error: "title, startAt, endAt are required" }, 400);
    }
    const event = await createCalendarEvent({
      authorUserId: userId,
      type: "group",
      groupId,
      groupName: body.groupName ? String(body.groupName) : undefined,
      groupKind: body.groupKind ? String(body.groupKind) : undefined,
      title,
      content: body.content ? String(body.content) : undefined,
      location: body.location ? String(body.location) : undefined,
      startAt,
      endAt,
      isAllDay: Boolean(body.isAllDay),
      color: body.color ? String(body.color) : undefined,
      pushEnabled: body.pushNotifySilent === true ? false : body.pushEnabled !== false,
      pushBeforeMinutes: Number(body.pushBeforeMinutes) || 30,
      repeatType: (body.repeatType || "none") as "none" | "daily" | "weekly" | "monthly",
      repeatEndDate: body.repeatEndDate ? String(body.repeatEndDate) : null,
      memberUserIds: Array.isArray(body.memberUserIds)
        ? body.memberUserIds.map(String)
        : undefined,
      notifyUserIds: Array.isArray(body.notifyUserIds)
        ? body.notifyUserIds.map(String)
        : undefined
    });
    return c.json({ ok: true, event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message.includes("FORBIDDEN") ? 403 : 400);
  }
});

calendarRoutes.get("/group/:groupId", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const groupId = c.req.param("groupId");
    const from = c.req.query("from") || undefined;
    const to = c.req.query("to") || undefined;
    const events = await listCalendarEvents({ userId, type: "group", groupId, from, to });
    return c.json({ ok: true, events });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

calendarRoutes.get("/all", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const from = c.req.query("from") || undefined;
    const to = c.req.query("to") || undefined;
    const groupKind = c.req.query("groupKind") || undefined;
    const events = await listCalendarEvents({ userId, from, to, groupKind });
    return c.json({ ok: true, events });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[calendar] GET /all failed:", message);
    return c.json({ error: message }, 500);
  }
});

calendarRoutes.get("/events/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const event = await getCalendarEventDetail(c.req.param("id"), userId);
    return c.json({ ok: true, event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message.includes("NOT_FOUND") ? 404 : 403);
  }
});

calendarRoutes.put("/group/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<Record<string, unknown>>();
    const event = await updateCalendarEvent(c.req.param("id"), userId, {
      title: body.title ? String(body.title) : undefined,
      content: body.content != null ? String(body.content) : undefined,
      location: body.location != null ? String(body.location) : undefined,
      startAt: body.startAt ? String(body.startAt) : undefined,
      endAt: body.endAt ? String(body.endAt) : undefined,
      isAllDay: body.isAllDay != null ? Boolean(body.isAllDay) : undefined,
      color: body.color ? String(body.color) : undefined,
      pushEnabled: body.pushEnabled != null ? Boolean(body.pushEnabled) : undefined,
      pushBeforeMinutes:
        body.pushBeforeMinutes != null ? Number(body.pushBeforeMinutes) : undefined,
      repeatType: body.repeatType as "none" | "daily" | "weekly" | "monthly" | undefined,
      repeatEndDate: body.repeatEndDate != null ? String(body.repeatEndDate) : undefined
    });
    return c.json({ ok: true, event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message.includes("FORBIDDEN") ? 403 : 400);
  }
});

calendarRoutes.delete("/group/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    await deleteCalendarEvent(c.req.param("id"), userId);
    return c.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, message.includes("FORBIDDEN") ? 403 : 400);
  }
});

calendarRoutes.post("/events/:id/rsvp", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ status?: string }>();
    const status = String(body.status || "pending") as "pending" | "accepted" | "declined" | "tentative";
    const members = await setEventRsvp(c.req.param("id"), userId, status);
    return c.json({ ok: true, members });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

calendarRoutes.post("/push/send", async (c) => {
  try {
    const body = await c.req.json<{
      userIds?: string[];
      title?: string;
      body?: string;
      groupName?: string;
      eventTitle?: string;
      startAt?: string;
      eventId?: string;
      groupId?: string;
    }>();
    const userIds = body.userIds || [];
    const groupName = body.groupName || "그룹";
    const eventTitle = body.eventTitle || body.title || "일정";
    const when = body.startAt
      ? new Date(body.startAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "";
    const pushBody = body.body || `[${groupName}] ${eventTitle} ${when} 일정이 있어요`;
    for (const uid of userIds) {
      await enqueueFcmPush({
        userId: uid,
        title: `📅 ${eventTitle}`,
        body: pushBody,
        channel: "office_calendar",
        payload: { type: "office-calendar-event", eventId: body.eventId, groupId: body.groupId }
      });
    }
    return c.json({ ok: true, sent: userIds.length });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

calendarRoutes.post("/push/schedule", async (c) => {
  try {
    const body = await c.req.json<{
      userIds?: string[];
      eventTitle?: string;
      groupName?: string;
      startAt?: string;
      pushBeforeMinutes?: number;
      eventId?: string;
      groupId?: string;
    }>();
    const userIds = body.userIds || [];
    const mins = Number(body.pushBeforeMinutes) || 30;
    const startAt = String(body.startAt || "");
    if (!startAt || !userIds.length) return c.json({ error: "startAt and userIds required" }, 400);
    const fireAt = new Date(new Date(startAt).getTime() - mins * 60 * 1000);
    const groupName = body.groupName || "그룹";
    const eventTitle = body.eventTitle || "일정";
    const when = new Date(startAt).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const pushBody = `[${groupName}] ${eventTitle} ${when} 일정이 있어요`;
    const { scheduleReminderPushes } = await import("../services/calendar/vlueCalendarService.js");
    await scheduleReminderPushes({
      eventId: body.eventId || "",
      targets: userIds,
      groupName,
      title: eventTitle,
      startAt,
      pushBeforeMinutes: mins,
      groupId: body.groupId || null
    });
    return c.json({ ok: true, scheduledAt: fireAt.toISOString(), count: userIds.length, body: pushBody });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});

calendarRoutes.post("/parse", async (c) => {
  try {
    const body = await c.req.json<{ message?: string }>();
    const message = String(body.message || "").trim();
    if (!message) return c.json({ error: "message is required" }, 400);
    const result = await parseCalendarNaturalLanguage(message);
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "unknown" }, 400);
  }
});
