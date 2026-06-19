import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  getMailTalkRoomById,
  listMailTalkMessages,
  listMailTalkRooms,
  upsertMailTalkTemplate
} from "../services/mailTalk/mailTalkStore.js";
import { resolveMailTalkTemplateForUser } from "../services/mailTalk/mailTalkTemplateService.js";
import { sendMailTalkChatMessage } from "../services/mailTalk/mailTalkOutboundService.js";
import { handleMailTalkSnsWebhook } from "../services/mailTalk/mailTalkSnsWebhookService.js";
import {
  createMailTalkAttachmentUploadUrl,
  isMailTalkAttachmentStorageConfigured
} from "../services/mailTalk/mailTalkAttachmentStorage.js";

export const mailTalkRoutes = new Hono();

/** AWS SNS — SES Bounce/Complaint (인증 없음, SNS 구독 확인용) */
mailTalkRoutes.post("/webhooks/ses-sns", async (c) => {
  const raw = await c.req.text();
  try {
    const result = await handleMailTalkSnsWebhook(raw);
    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 400);
    }
    return c.json({ received: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    console.error("[mail-talk/ses-sns]", message);
    return c.json({ received: true, error: message }, 200);
  }
});

mailTalkRoutes.use("*", requireUserHeader);

mailTalkRoutes.get("/attachment-upload/status", (c) => {
  const configured = isMailTalkAttachmentStorageConfigured();
  return c.json({ ok: true, configured, provider: configured ? "cloudflare-r2" : null });
});

mailTalkRoutes.post("/attachment-upload-url", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ fileName?: string; contentType?: string; fileSize?: number }>();
    const result = await createMailTalkAttachmentUploadUrl({
      userId,
      fileName: String(body?.fileName || "attachment.bin"),
      contentType: String(body?.contentType || "application/octet-stream"),
      fileSize: Number(body?.fileSize) || 0
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const status = message.includes("설정되지 않") ? 503 : 400;
    return c.json({ ok: false, error: message }, status);
  }
});

/** 채팅방 목록 */
mailTalkRoutes.get("/rooms", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const rooms = await listMailTalkRooms(userId, 50);
  return c.json({
    ok: true,
    rooms: rooms.map((r) => ({
      id: r.id,
      counterpartyEmail: r.counterparty_email,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    }))
  });
});

/** 채팅방 메시지 타임라인 */
mailTalkRoutes.get("/rooms/:roomId/messages", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const roomId = c.req.param("roomId");
  const room = await getMailTalkRoomById(userId, roomId);
  if (!room) return c.json({ error: "NOT_FOUND" }, 404);

  const messages = await listMailTalkMessages(roomId, 200);
  return c.json({
    ok: true,
    room: {
      id: room.id,
      counterpartyEmail: room.counterparty_email
    },
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      bodyText: m.body_text,
      rawBodyText: m.raw_body_text,
      bodyHtml: m.body_html,
      subject: m.subject,
      attachmentUrls: m.attachment_urls,
      sesMessageId: m.ses_message_id,
      createdAt: m.created_at.toISOString()
    }))
  });
});

/** 메일톡 채팅 한 줄 → 비즈니스 HTML 이메일 SES 발송 */
mailTalkRoutes.post("/rooms/:roomId/send", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const roomId = c.req.param("roomId");
    const body = await c.req.json<{
      chatBody?: string;
      subject?: string;
      attachmentUrls?: string[];
    }>();

    const result = await sendMailTalkChatMessage(userId, {
      roomId,
      chatBody: String(body.chatBody || ""),
      subject: body.subject,
      attachmentUrls: body.attachmentUrls
    });

    return c.json({
      ok: true,
      roomId: result.room.id,
      message: {
        id: result.message.id,
        direction: result.message.direction,
        bodyText: result.message.body_text,
        subject: result.message.subject,
        sesMessageId: result.sesResult.messageId,
        createdAt: result.message.created_at.toISOString()
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** 신규 거래처 이메일로 첫 메시지 발송 (방 자동 생성) */
mailTalkRoutes.post("/send", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      counterpartyEmail?: string;
      chatBody?: string;
      subject?: string;
      attachmentUrls?: string[];
    }>();

    const result = await sendMailTalkChatMessage(userId, {
      counterpartyEmail: String(body.counterpartyEmail || ""),
      chatBody: String(body.chatBody || ""),
      subject: body.subject,
      attachmentUrls: body.attachmentUrls
    });

    return c.json({
      ok: true,
      roomId: result.room.id,
      message: {
        id: result.message.id,
        direction: result.message.direction,
        bodyText: result.message.body_text,
        subject: result.message.subject,
        sesMessageId: result.sesResult.messageId,
        createdAt: result.message.created_at.toISOString()
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** 비즈니스 메일 템플릿 조회 */
mailTalkRoutes.get("/template", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const template = await resolveMailTalkTemplateForUser(userId);
  return c.json({ ok: true, template });
});

/** 비즈니스 메일 템플릿 저장 */
mailTalkRoutes.put("/template", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      greetingText?: string;
      closingText?: string;
      signatureHtml?: string;
      logoUrl?: string;
      displayName?: string;
      jobTitle?: string;
      companyName?: string;
      phone?: string;
      email?: string;
      website?: string;
    }>();

    const saved = await upsertMailTalkTemplate(userId, {
      greeting_text: body.greetingText ?? null,
      closing_text: body.closingText ?? null,
      signature_html: body.signatureHtml ?? null,
      logo_url: body.logoUrl ?? null,
      display_name: body.displayName ?? null,
      job_title: body.jobTitle ?? null,
      company_name: body.companyName ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      website: body.website ?? null
    });

    return c.json({
      ok: true,
      template: {
        greetingText: saved.greeting_text,
        closingText: saved.closing_text,
        signatureHtml: saved.signature_html,
        logoUrl: saved.logo_url,
        displayName: saved.display_name,
        jobTitle: saved.job_title,
        companyName: saved.company_name,
        phone: saved.phone,
        email: saved.email,
        website: saved.website,
        updatedAt: saved.updated_at.toISOString()
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});
