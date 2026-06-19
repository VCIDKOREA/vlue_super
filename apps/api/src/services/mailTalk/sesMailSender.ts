import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export type SesSendInput = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SesSendResult = {
  provider: "aws-ses";
  messageId: string;
  accepted: string[];
};

let sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (sesClient) return sesClient;
  const region = (process.env.AWS_REGION || process.env.AWS_SES_REGION || "ap-northeast-2").trim();
  sesClient = new SESClient({
    region,
    credentials: {
      accessKeyId: String(process.env.AWS_ACCESS_KEY_ID || "").trim(),
      secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY || "").trim()
    }
  });
  return sesClient;
}

export function isSesConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim()
  );
}

/**
 * AWS SES API로 HTML 비즈니스 메일 발송.
 */
export async function sendEmailViaSes(input: SesSendInput): Promise<SesSendResult> {
  if (!isSesConfigured()) {
    throw new Error("AWS SES credentials are not configured (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)");
  }

  const client = getSesClient();
  const cmd = new SendEmailCommand({
    Source: input.from,
    Destination: { ToAddresses: [input.to] },
    ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
    Message: {
      Subject: { Data: input.subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: input.html, Charset: "UTF-8" },
        ...(input.text ? { Text: { Data: input.text, Charset: "UTF-8" } } : {})
      }
    }
  });

  const res = await client.send(cmd);
  const messageId = res.MessageId || `ses_${Date.now()}`;

  return {
    provider: "aws-ses",
    messageId,
    accepted: [input.to]
  };
}

/**
 * 개발/스테이징 — SES 미설정 시 mock 발송.
 */
export async function sendEmailViaSesOrMock(input: SesSendInput): Promise<SesSendResult> {
  if (!isSesConfigured()) {
    const id = `mock_ses_${Date.now()}`;
    console.info("[mock-ses] send", {
      from: input.from,
      to: input.to,
      subject: input.subject
    });
    return { provider: "aws-ses", messageId: id, accepted: [input.to] };
  }
  return sendEmailViaSes(input);
}
