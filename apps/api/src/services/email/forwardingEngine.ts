import { ssePublish } from "../../realtime/sseHub.js";
import { resolveSmtpProvider } from "../adapters/smtpProvider.js";
import type { ParsedInboundEmail } from "../office/emailWebhookShield.js";
import {
  findMappingByFullVirtualEmail,
  insertForwardingNotification,
  type UserEmailMappingRow
} from "./userEmailMappingsStore.js";
import { insertInappMailCache } from "./inappMailCacheStore.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";

function parseAddressField(raw: string) {
  const s = String(raw || "").trim();
  const angle = s.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  const email = s.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return email?.[0] || s;
}

export async function lookupMappingByToAddress(
  toAddress: string
): Promise<UserEmailMappingRow | null> {
  const email = parseAddressField(toAddress).toLowerCase();
  if (!email) return null;
  return findMappingByFullVirtualEmail(email);
}

export async function relayInboundEmail(
  mapping: UserEmailMappingRow,
  parsed: ParsedInboundEmail
) {
  const target = String(mapping.target_master_email || "").trim().toLowerCase();
  if (!target) {
    return { ok: false as const, error: "NO_TARGET_MASTER_EMAIL" };
  }

  const smtp = resolveSmtpProvider();
  const result = await smtp.send({
    from: parsed.from || `noreply@${mapping.full_virtual_email.split("@")[1] || "vlue.kr"}`,
    to: target,
    subject: parsed.subject || "(제목 없음)",
    text: parsed.text,
    html: parsed.html,
    replyTo: parsed.from || undefined,
    attachments: parsed.attachments.map((a) => ({
      fileName: a.fileName,
      contentType: a.contentType,
      content: a.buffer
    }))
  });

  return { ok: true as const, result };
}

export async function triggerForwardingNotification(
  userId: string,
  parsed: ParsedInboundEmail,
  fullVirtualEmail: string
) {
  const fromAddress = parseAddressField(parsed.from || "unknown@unknown");
  const subject = String(parsed.subject || "(제목 없음)").trim();
  const bodyText = String(parsed.text || parsed.html || "").replace(/<[^>]+>/g, " ");

  const cache = await insertInappMailCache({
    userId,
    mailSource: "VIRTUAL_FORWARD",
    fromAddress,
    subject,
    bodyText,
    receivedAt: new Date()
  });

  const log = await insertForwardingNotification({
    userId,
    fromAddress,
    subject,
    fullVirtualEmail
  });

  ssePublish(userId, {
    type: "vlue-email-forwarded",
    message: `새 메일: ${subject}`,
    from: fromAddress,
    subject,
    fullVirtualEmail,
    notificationId: log.id,
    cacheId: cache.id,
    at: new Date().toISOString()
  });

  await sendOfficePushToUser(userId, "VLUE 메일", subject, {
    type: "vlue-email-inapp",
    mailSource: "VIRTUAL_FORWARD",
    cacheId: cache.id,
    from: fromAddress
  });

  return { log, cache };
}

export async function processInboundForwarding(parsed: ParsedInboundEmail) {
  if (!parsed.to) {
    return { ok: false as const, status: 400, error: "MISSING_RECIPIENT" };
  }

  const mapping = await lookupMappingByToAddress(parsed.to);
  if (!mapping) {
    return { ok: false as const, status: 404, error: "UNKNOWN_RECIPIENT" };
  }

  const forwardMode = (process.env.VLUE_EMAIL_FORWARD_MODE || "cloudflare_edge").toLowerCase();
  const shouldRelay = forwardMode === "smtp_relay";

  if (shouldRelay) {
    const relay = await relayInboundEmail(mapping, parsed);
    if (!relay.ok) {
      return { ok: false as const, status: 422, error: relay.error };
    }
  } else if (!mapping.target_master_email) {
    return { ok: false as const, status: 422, error: "NO_TARGET_MASTER_EMAIL" };
  }

  await triggerForwardingNotification(mapping.user_id, parsed, mapping.full_virtual_email);

  return {
    ok: true as const,
    userId: mapping.user_id,
    forwardedTo: mapping.target_master_email,
    mode: forwardMode
  };
}
