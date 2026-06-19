import { ssePublish } from "../../realtime/sseHub.js";
import { buildBusinessEmailHtml } from "./businessEmailTemplate.js";
import { resolveMailTalkTemplateForUser } from "./mailTalkTemplateService.js";
import {
  assertUserCanMailTalk,
  validateCounterpartyNotSelf
} from "./mailTalkInboundService.js";
import {
  getMailTalkRoomById,
  getOrCreateMailTalkRoom,
  insertMailTalkMessage
} from "./mailTalkStore.js";
import { sendEmailViaSesOrMock } from "./sesMailSender.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";

export async function sendMailTalkChatMessage(
  userId: string,
  input: {
    roomId?: string;
    counterpartyEmail?: string;
    chatBody: string;
    subject?: string;
    attachmentUrls?: string[];
  }
) {
  const mapping = await assertUserCanMailTalk(userId);
  const from = mapping.full_virtual_email.toLowerCase();

  let room =
    input.roomId != null
      ? await getMailTalkRoomById(userId, input.roomId)
      : input.counterpartyEmail
        ? await getOrCreateMailTalkRoom(userId, input.counterpartyEmail)
        : null;

  if (!room) {
    throw new Error("roomId 또는 counterpartyEmail이 필요합니다.");
  }

  validateCounterpartyNotSelf(room.counterparty_email, from);

  const chatBody = String(input.chatBody || "").trim();
  if (!chatBody) {
    throw new Error("메시지 내용을 입력해 주세요.");
  }

  const subject =
    String(input.subject || "").trim() ||
    `VLUE 메일톡 — ${room.counterparty_email.split("@")[0]}`;

  const template = await resolveMailTalkTemplateForUser(userId);
  const { html, text } = buildBusinessEmailHtml({ chatBody, subject, template });

  const sesResult = await sendEmailViaSesOrMock({
    from,
    to: room.counterparty_email,
    subject,
    html,
    text,
    replyTo: from
  });

  const message = await insertMailTalkMessage({
    roomId: room.id,
    direction: "SENT",
    bodyText: chatBody,
    rawBodyText: text,
    bodyHtml: html,
    subject,
    attachmentUrls: input.attachmentUrls || [],
    sesMessageId: sesResult.messageId
  });

  ssePublish(userId, {
    type: "mail-talk-sent",
    roomId: room.id,
    messageId: message.id,
    to: room.counterparty_email,
    sesMessageId: sesResult.messageId,
    at: message.created_at.toISOString()
  });

  await sendOfficePushToUser(userId, "메일톡 발송", subject, {
    type: "mail-talk-outbound",
    roomId: room.id,
    messageId: message.id
  });

  return { room, message, sesResult };
}
