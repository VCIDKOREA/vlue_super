import { createMiddleware } from "hono/factory";
import { verifyVmingConsentForChat } from "../services/vming/consent/vmingConsentService.js";

export type AiChatVariables = {
  vlueUserId: string;
  aiChatBody: Record<string, unknown>;
  maskedUserIds?: string[];
};

export const vmingConsentMiddleware = createMiddleware<{ Variables: AiChatVariables }>(async (c, next) => {
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  c.set("aiChatBody", body);

  const userId = c.get("vlueUserId");
  const roomId = body.roomId ? String(body.roomId) : undefined;
  const type = body.type ? String(body.type) : undefined;

  const verdict = await verifyVmingConsentForChat({ userId, roomId, type });
  if (!verdict.ok) {
    return c.json(verdict.body, verdict.status as 403);
  }
  if (verdict.maskedUserIds?.length) {
    c.set("maskedUserIds", verdict.maskedUserIds);
  }
  await next();
});
