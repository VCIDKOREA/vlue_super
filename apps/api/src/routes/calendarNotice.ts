import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { enqueueFcmPush } from "../services/office/fcmPushQueue.js";

export const calendarNoticeRoutes = new Hono();

calendarNoticeRoutes.use("*", requireUserHeader);

calendarNoticeRoutes.post("/publish", async (c) => {
  try {
    const authorId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      roomId?: string;
      roomName?: string;
      noticeId?: string;
      title?: string;
      body?: string;
      eventId?: string;
      startAt?: string;
      audienceUserIds?: string[];
    }>();
    const title = String(body.title || "일정 공지").trim();
    const pushBody = String(body.body || title).slice(0, 500);
    const roomName = String(body.roomName || body.roomId || "채팅방").trim();
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const targets = (body.audienceUserIds || []).filter(
      (id) => id && id !== authorId && uuidRe.test(String(id))
    );

    for (const userId of targets) {
      await enqueueFcmPush({
        userId,
        title: `📅 [${roomName}] ${title}`,
        body: pushBody,
        channel: "office_calendar",
        payload: {
          type: "vlue-calendar-notice",
          noticeId: body.noticeId,
          roomId: body.roomId,
          eventId: body.eventId
        }
      });
    }

    return c.json({ ok: true, sent: targets.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return c.json({ error: message }, 400);
  }
});
