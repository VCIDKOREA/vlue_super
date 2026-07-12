export type MailSendInput = {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    fileName: string;
    contentType?: string;
    sourceUrl?: string;
    content?: Buffer;
  }>;
};

export type MailSendResult = {
  provider: string;
  messageId: string;
  accepted: string[];
  rejected: string[];
};

export interface SmtpProviderPort {
  send(input: MailSendInput): Promise<MailSendResult>;
}

export class MockSmtpProvider implements SmtpProviderPort {
  async send(input: MailSendInput): Promise<MailSendResult> {
    const id = `mock_mail_${Date.now()}`;
    console.info("[mock-smtp] send", {
      from: input.from,
      to: input.to,
      subject: input.subject
    });
    return {
      provider: "mock-smtp",
      messageId: id,
      accepted: [input.to],
      rejected: []
    };
  }
}

export class ResendSmtpProvider implements SmtpProviderPort {
  async send(input: MailSendInput): Promise<MailSendResult> {
    const apiKey = String(process.env.RESEND_API_KEY || "").trim();
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo
      })
    });

    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      throw new Error(data.message || `Resend error (${res.status})`);
    }

    return {
      provider: "resend",
      messageId: data.id || `resend_${Date.now()}`,
      accepted: [input.to],
      rejected: []
    };
  }
}

export function resolveSmtpProvider(): SmtpProviderPort {
  const provider = (process.env.SMTP_PROVIDER || "mock").trim().toLowerCase();
  if (provider === "resend") return new ResendSmtpProvider();
  return new MockSmtpProvider();
}

/** 실제 수신함으로 메일이 나가는 제공자인지 (mock이면 false) */
export function isRealSmtpDeliveryConfigured(): boolean {
  const provider = (process.env.SMTP_PROVIDER || "mock").trim().toLowerCase();
  if (provider !== "resend") return false;
  return Boolean(String(process.env.RESEND_API_KEY || "").trim());
}
