export type ParsedEmailAttachment = {
  fileName: string;
  contentType: string;
  buffer: Buffer;
};

export type ParsedInboundEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments: ParsedEmailAttachment[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pickString(...vals: unknown[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function decodeBase64Payload(raw: string) {
  const cleaned = String(raw || "").replace(/\s/g, "");
  if (!cleaned) return Buffer.alloc(0);
  return Buffer.from(cleaned, "base64");
}

function parseAddressField(raw: unknown) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const angle = s.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  const email = s.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return email?.[0] || s;
}

function contentTypeFromName(fileName: string, hint?: string) {
  const h = String(hint || "").toLowerCase().split(";")[0].trim();
  if (h) return h;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function pushAttachment(
  out: ParsedEmailAttachment[],
  input: Record<string, unknown>
) {
  const fileName = pickString(input.fileName, input.filename, "attachment.bin");
  const contentType = contentTypeFromName(
    fileName,
    pickString(input.contentType, input.mimeType, input.type)
  );
  let buffer = Buffer.alloc(0);
  const raw = input.content ?? input.data;
  if (raw instanceof Buffer) buffer = raw;
  else if (raw instanceof Uint8Array) buffer = Buffer.from(raw);
  else if (typeof raw === "string") buffer = decodeBase64Payload(raw);
  if (!buffer.length) return;
  out.push({ fileName, contentType, buffer });
}

export function resolveRecipientUserId(toAddress: string): string | null {
  const email = parseAddressField(toAddress).toLowerCase();
  const local = email.split("@")[0]?.trim();
  if (!local) return null;
  if (UUID_RE.test(local)) return local;
  const envMap = (process.env.VLUE_EMAIL_LOCAL_USER_MAP || "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean);
  for (const pair of envMap) {
    const [alias, uid] = pair.split("=").map((s) => s.trim());
    if (alias && uid && alias.toLowerCase() === local.toLowerCase()) return uid;
  }
  return null;
}

export async function parseCloudflareEmailWebhook(
  contentType: string,
  body: unknown,
  parseBody: () => Promise<Record<string, string | File>>
): Promise<ParsedInboundEmail> {
  const ct = String(contentType || "").toLowerCase();
  const attachments: ParsedEmailAttachment[] = [];

  if (ct.includes("application/json")) {
    const json =
      typeof body === "object" && body !== null && !(body instanceof ArrayBuffer)
        ? (body as Record<string, unknown>)
        : JSON.parse(String(body || "{}"));

    const from = parseAddressField(
      pickString(json.from, json.mail_from, json.sender, json.email, json.from_address)
    );
    const to = parseAddressField(
      pickString(json.to, json.rcpt_to, json.recipient, json.to_address, json.receiver)
    );
    const subject = pickString(json.subject, json.Subject);
    const text = pickString(json.text, json.plain_body, json.message, json.body, json.body_text);
    const html = pickString(json.html, json.html_body);

    const list = Array.isArray(json.attachments) ? json.attachments : [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      pushAttachment(attachments, item as Record<string, unknown>);
    }

    return { from, to, subject, text: text || html, html: html || undefined, attachments };
  }

  const form = await parseBody();
  const from = parseAddressField(
    pickString(form.from, form.mail_from, form.sender, form["headers.from"])
  );
  const to = parseAddressField(
    pickString(form.to, form.rcpt_to, form.recipient, form["headers.to"])
  );
  const subject = pickString(form.subject, form.Subject);
  const text = pickString(form.text, form.plain, form.plain_body, form.body, form.message);
  const html = pickString(form.html, form.html_body);

  for (const [key, val] of Object.entries(form)) {
    if (typeof val === "string") continue;
    if (!(val instanceof File)) continue;
    const buf = Buffer.from(await val.arrayBuffer());
    if (!buf.length) continue;
    const fileName = val.name || key;
    pushAttachment(attachments, {
      fileName,
      contentType: val.type || contentTypeFromName(fileName),
      content: buf
    });
  }

  const jsonField = pickString(form.payload, form.json, form.data);
  if (jsonField) {
    try {
      const nested = JSON.parse(jsonField) as Record<string, unknown>;
      const nestedList = Array.isArray(nested.attachments) ? nested.attachments : [];
      for (const item of nestedList) {
        if (!item || typeof item !== "object") continue;
        pushAttachment(attachments, item as Record<string, unknown>);
      }
    } catch {
      /* ignore */
    }
  }

  return { from, to, subject, text: text || html, html: html || undefined, attachments };
}

export function assertEmailWebhookSecret(headerValue: string | undefined) {
  const expected = String(process.env.VLUE_OFFICE_EMAIL_WEBHOOK_SECRET || "").trim();
  if (!expected) return true;
  const got = String(headerValue || "").trim();
  if (!got) return false;
  if (got === expected) return true;
  if (got === `Bearer ${expected}`) return true;
  return false;
}
