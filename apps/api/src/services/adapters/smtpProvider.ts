export type MailSendInput = {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{ fileName: string; contentType?: string; sourceUrl?: string }>;
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
    return {
      provider: "mock-smtp",
      messageId: id,
      accepted: [input.to],
      rejected: []
    };
  }
}

export function resolveSmtpProvider(): SmtpProviderPort {
  const provider = (process.env.SMTP_PROVIDER || "mock").trim().toLowerCase();
  if (provider === "mock") return new MockSmtpProvider();
  return new MockSmtpProvider();
}

