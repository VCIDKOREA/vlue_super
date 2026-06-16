import {
  assertEmailWebhookSecret,
  parseCloudflareEmailWebhook,
  type ParsedInboundEmail
} from "../office/emailWebhookShield.js";
import { processInboundForwarding } from "./forwardingEngine.js";
import { listForwardingNotifications } from "./userEmailMappingsStore.js";

export { assertEmailWebhookSecret };

export async function handleInboundEmailForwardingWebhook(input: {
  contentType: string;
  rawBody?: unknown;
  parseMultipart: () => Promise<Record<string, string | File>>;
}) {
  const parsed = await parseCloudflareEmailWebhook(
    input.contentType,
    input.rawBody,
    input.parseMultipart
  );
  return processInboundForwarding(parsed);
}

export function mapNotificationRowsForApi(
  rows: Awaited<ReturnType<typeof listForwardingNotifications>>
) {
  return rows.map((row) => ({
    id: row.id,
    fromAddress: row.from_address,
    subject: row.subject,
    fullVirtualEmail: row.full_virtual_email,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  }));
}

export type { ParsedInboundEmail };
