import { ssePublish } from "../../realtime/sseHub.js";
import type { ParsedInboundEmail } from "../office/emailWebhookShield.js";
import { findMappingByUserId } from "../email/userEmailMappingsStore.js";
import { extractLatestReplyBody } from "./emailReplyParser.js";
import {
  getOrCreateMailTalkRoom,
  insertMailTalkMessage,
  normalizeEmail
} from "./mailTalkStore.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";
import { lookupMappingByToAddress } from "../email/forwardingEngine.js";

function parseAddressField(raw: string): string {
  const s = String(raw || "").trim();
  const angle = s.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim().toLowerCase();
  const email = s.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return (email?.[0] || s).toLowerCase();
}

/**
 * 가상메일 수신 → Mail Talk 채팅방에 RECEIVED 말풍선 적재.
 */
export async function ingestInboundMailToMailTalk(
  userId: string,
  parsed: ParsedInboundEmail,
  attachmentUrls: string[] = []
) {
  const fromEmail = parseAddressField(parsed.from || "");
  if (!fromEmail) {
    return { ok: false as const, error: "MISSING_FROM_ADDRESS" };
  }

  const bodyText = extractLatestReplyBody({ text: parsed.text, html: parsed.html });
  if (!bodyText) {
    return { ok: false as const, error: "EMPTY_BODY_AFTER_PARSE" };
  }

  const rawBodyText = String(parsed.text || "").trim() || null;
  const bodyHtml = parsed.html ? String(parsed.html) : null;

  const room = await getOrCreateMailTalkRoom(userId, fromEmail);
  const message = await insertMailTalkMessage({
    roomId: room.id,
    direction: "RECEIVED",
    bodyText,
    rawBodyText,
    bodyHtml,
    subject: String(parsed.subject || "").trim(),
    attachmentUrls
  });

  ssePublish(userId, {
    type: "mail-talk-received",
    roomId: room.id,
    counterpartyEmail: room.counterparty_email,
    messageId: message.id,
    subject: message.subject,
    at: message.created_at.toISOString()
  });

  await sendOfficePushToUser(userId, "메일톡", message.subject || "새 메시지", {
    type: "mail-talk-inbound",
    roomId: room.id,
    messageId: message.id
  });

  return { ok: true as const, room, message };
}

/**
 * 유저의 VLUE 가상메일 주소로 들어온 인바운드를 Mail Talk에 연결.
 */
export async function processMailTalkInboundFromWebhook(parsed: ParsedInboundEmail) {
  const mapping = await lookupMappingByToAddress(parsed.to || "");
  if (!mapping) {
    return { ok: false as const, error: "UNKNOWN_RECIPIENT" };
  }

  return ingestInboundMailToMailTalk(mapping.user_id, parsed);
}

export async function assertUserCanMailTalk(userId: string) {
  const mapping = await findMappingByUserId(userId);
  if (!mapping?.full_virtual_email) {
    throw new Error("가상 메일 주소가 설정되지 않았습니다.");
  }
  return mapping;
}

export function validateCounterpartyNotSelf(
  counterpartyEmail: string,
  ownVirtualEmail: string
) {
  if (normalizeEmail(counterpartyEmail) === normalizeEmail(ownVirtualEmail)) {
    throw new Error("자신의 메일 주소로는 발송할 수 없습니다.");
  }
}
