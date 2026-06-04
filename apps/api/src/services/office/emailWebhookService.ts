import { ssePublish } from "../../realtime/sseHub.js";
import {
  ingestVaultBuffer,
  markMailReceivedFileName
} from "./officeVaultIngest.js";
import {
  insertOfficeEmailInbox,
  listOfficeEmailInbox,
  parseJsonArray
} from "./officeEmailInbox.js";
import {
  assertEmailWebhookSecret,
  parseCloudflareEmailWebhook,
  resolveRecipientUserId,
  type ParsedInboundEmail
} from "./emailWebhookShield.js";

export { assertEmailWebhookSecret, listOfficeEmailInbox };

export async function handleOfficeEmailWebhook(input: {
  contentType: string;
  rawBody?: unknown;
  parseMultipart: () => Promise<Record<string, string | File>>;
}) {
  const parsed = await parseCloudflareEmailWebhook(
    input.contentType,
    input.rawBody,
    input.parseMultipart
  );

  if (!parsed.to) {
    return { ok: false as const, status: 400, error: "MISSING_RECIPIENT" };
  }

  const userId = resolveRecipientUserId(parsed.to);
  if (!userId) {
    return { ok: false as const, status: 404, error: "UNKNOWN_RECIPIENT" };
  }

  const ingested = await ingestEmailAttachments(userId, parsed);
  const row = await insertOfficeEmailInbox({
    userId,
    fromAddress: parsed.from || "unknown@unknown",
    toAddress: parsed.to,
    subject: parsed.subject || "(제목 없음)",
    bodyText: parsed.text,
    attachmentAssetIds: ingested.map((f) => f.id),
    attachmentNames: ingested.map((f) => f.fileName)
  });

  if (ingested.length > 0) {
    ssePublish(userId, {
      type: "vlue-office-email-arrived",
      message: "이메일 첨부파일이 자료실에 도착했습니다!",
      inboxId: row?.id,
      subject: parsed.subject,
      from: parsed.from,
      attachments: ingested.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        fileUrl: f.fileUrl,
        contentType: f.contentType
      })),
      at: new Date().toISOString()
    });
  } else {
    ssePublish(userId, {
      type: "vlue-office-email-arrived",
      message: "새 이메일이 수신함에 도착했습니다.",
      inboxId: row?.id,
      subject: parsed.subject,
      from: parsed.from,
      attachments: [],
      at: new Date().toISOString()
    });
  }

  return {
    ok: true as const,
    inboxId: row?.id,
    userId,
    ingestedCount: ingested.length,
    files: ingested
  };
}

async function ingestEmailAttachments(userId: string, parsed: ParsedInboundEmail) {
  const out: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    contentType: string;
  }> = [];

  for (const att of parsed.attachments) {
    try {
      const marked = markMailReceivedFileName(att.fileName);
      const row = await ingestVaultBuffer({
        userId,
        fileName: marked,
        buffer: att.buffer,
        contentType: att.contentType
      });
      out.push({
        id: row.id,
        fileName: row.fileName,
        fileUrl: row.fileUrl,
        contentType: row.contentType
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : String(e);
      if (code === "UNSUPPORTED_ATTACHMENT_TYPE") continue;
      throw e;
    }
  }
  return out;
}

export function mapInboxRowsForApi(
  rows: Awaited<ReturnType<typeof listOfficeEmailInbox>>
) {
  return rows.map((row) => ({
    id: row.id,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    subject: row.subject,
    bodyText: row.body_text,
    attachmentAssetIds: parseJsonArray(row.attachment_asset_ids),
    attachmentNames: parseJsonArray(row.attachment_names),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  }));
}
