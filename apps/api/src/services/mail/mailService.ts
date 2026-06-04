import { resolveSmtpProvider } from "../adapters/smtpProvider.js";

type MailAccount = {
  id: string;
  userId: string;
  address: string;
  createdAt: string;
};

type MailMessage = {
  id: string;
  accountId: string;
  from: string;
  to: string;
  subject: string;
  text?: string;
  attachmentAssetIds: string[];
  createdAt: string;
};

const accounts = new Map<string, MailAccount>();
const messages = new Map<string, MailMessage>();

function sanitizeLocalPart(source: string) {
  const base = source.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return base || `user${Date.now()}`;
}

export function getOrCreateMailAccount(userId: string, hint?: string) {
  const existing = [...accounts.values()].find((x) => x.userId === userId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  const local = sanitizeLocalPart(hint || userId.replace(/-/g, "").slice(0, 12));
  const row: MailAccount = {
    id,
    userId,
    address: `${local}@vlue.kr`,
    createdAt: new Date().toISOString()
  };
  accounts.set(id, row);
  return row;
}

export async function sendMailFromAccount(input: {
  accountId: string;
  to: string;
  subject: string;
  text?: string;
  attachmentAssetIds?: string[];
}) {
  const account = accounts.get(input.accountId);
  if (!account) throw new Error("mail account not found");
  const provider = resolveSmtpProvider();
  const sent = await provider.send({
    from: account.address,
    to: input.to,
    subject: input.subject,
    text: input.text
  });
  const row: MailMessage = {
    id: sent.messageId,
    accountId: account.id,
    from: account.address,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachmentAssetIds: input.attachmentAssetIds || [],
    createdAt: new Date().toISOString()
  };
  messages.set(row.id, row);
  return row;
}

