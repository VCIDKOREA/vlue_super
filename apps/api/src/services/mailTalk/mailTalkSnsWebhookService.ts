import { insertMailTalkSesEvent } from "./mailTalkStore.js";

type SnsEnvelope = {
  Type?: string;
  MessageId?: string;
  TopicArn?: string;
  Message?: string;
  SubscribeURL?: string;
  Token?: string;
  Timestamp?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
};

type SesNotificationPayload = {
  notificationType?: string;
  mail?: { messageId?: string; destination?: string[]; source?: string };
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: Array<{ emailAddress?: string; action?: string; status?: string }>;
  };
  complaint?: {
    complainedRecipients?: Array<{ emailAddress?: string }>;
    complaintFeedbackType?: string;
  };
};

async function confirmSnsSubscription(subscribeUrl: string) {
  const res = await fetch(subscribeUrl, { method: "GET" });
  if (!res.ok) {
    throw new Error(`SNS subscription confirm failed (${res.status})`);
  }
}

function extractRecipient(payload: SesNotificationPayload): string {
  const bounce = payload.bounce?.bouncedRecipients?.[0]?.emailAddress;
  if (bounce) return bounce;
  const complaint = payload.complaint?.complainedRecipients?.[0]?.emailAddress;
  if (complaint) return complaint;
  const dest = payload.mail?.destination?.[0];
  return dest || "unknown@unknown";
}

async function handleSesEvent(payload: SesNotificationPayload) {
  const eventType = String(payload.notificationType || "Unknown").trim();
  const recipient = extractRecipient(payload);
  const sesMessageId = payload.mail?.messageId || null;

  await insertMailTalkSesEvent({
    eventType,
    recipientEmail: recipient,
    sesMessageId,
    payloadJson: payload
  });

  if (eventType === "Bounce") {
    console.warn("[mail-talk/ses] bounce", {
      recipient,
      type: payload.bounce?.bounceType,
      subType: payload.bounce?.bounceSubType
    });
    // TODO: 수신 거부 목록(suppression list) 연동 · 유저 알림
  }

  if (eventType === "Complaint") {
    console.warn("[mail-talk/ses] complaint", {
      recipient,
      feedback: payload.complaint?.complaintFeedbackType
    });
    // TODO: 스팸 신고자 자동 차단 · 운영 알림
  }

  return { eventType, recipient, sesMessageId };
}

/**
 * AWS SNS → SES Bounce/Complaint 웹훅 처리 뼈대.
 */
export async function handleMailTalkSnsWebhook(rawBody: string) {
  let envelope: SnsEnvelope;
  try {
    envelope = JSON.parse(rawBody) as SnsEnvelope;
  } catch {
    return { ok: false as const, status: 400, error: "INVALID_JSON" };
  }

  const type = String(envelope.Type || "").trim();

  if (type === "SubscriptionConfirmation") {
    const url = String(envelope.SubscribeURL || "").trim();
    if (!url) {
      return { ok: false as const, status: 400, error: "MISSING_SUBSCRIBE_URL" };
    }
    await confirmSnsSubscription(url);
    return { ok: true as const, action: "subscription_confirmed" as const };
  }

  if (type === "UnsubscribeConfirmation") {
    return { ok: true as const, action: "unsubscribe_acknowledged" as const };
  }

  if (type === "Notification") {
    let inner: SesNotificationPayload;
    try {
      inner = JSON.parse(String(envelope.Message || "{}")) as SesNotificationPayload;
    } catch {
      return { ok: false as const, status: 400, error: "INVALID_SNS_MESSAGE" };
    }

    const outcome = await handleSesEvent(inner);
    return { ok: true as const, action: "notification_processed" as const, ...outcome };
  }

  return { ok: true as const, action: "ignored" as const, snsType: type };
}
