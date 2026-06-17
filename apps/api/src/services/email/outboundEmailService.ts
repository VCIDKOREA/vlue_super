import { resolveSmtpProvider } from "../adapters/smtpProvider.js";
import { findMappingByUserId } from "./userEmailMappingsStore.js";
import { insertUserEmail } from "./userEmailsStore.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";

export async function sendUserOutboundEmail(
  userId: string,
  input: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    inReplyToSubject?: string;
  }
) {
  const mapping = await findMappingByUserId(userId);
  if (!mapping?.full_virtual_email) {
    throw new Error("가상 메일 주소가 설정되지 않았습니다.");
  }

  const to = String(input.to || "").trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error("받는 사람 이메일을 입력해 주세요.");
  }

  const subject = String(input.subject || "").trim() || "(제목 없음)";
  const text = String(input.text || "").trim();
  const html = input.html ? String(input.html) : undefined;
  if (!text && !html) {
    throw new Error("메일 본문을 입력해 주세요.");
  }

  const from = mapping.full_virtual_email.toLowerCase();
  const smtp = resolveSmtpProvider();
  const result = await smtp.send({
    from,
    to,
    subject,
    text: text || undefined,
    html,
    replyTo: from
  });

  const saved = await insertUserEmail({
    userId,
    direction: "outbound",
    mailSource: "OUTBOUND_SMTP",
    fromAddress: from,
    toAddress: to,
    subject,
    bodyText: text || subject,
    bodyHtml: html ?? null,
    sentAt: new Date()
  });

  ssePublish(userId, {
    type: "vlue-email-sent",
    subject,
    to,
    mailId: saved.id,
    at: new Date().toISOString()
  });

  await sendOfficePushToUser(userId, "VLUE 메일 발송", subject, {
    type: "vlue-email-outbound",
    mailId: saved.id,
    to
  });

  return { result, mail: saved };
}
