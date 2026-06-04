import fs from "node:fs";
import path from "node:path";
import { resolveStorageProvider } from "../adapters/storageProvider.js";
import { addAssetFile } from "../vault/assetFileService.js";

export function vaultRootDir() {
  return (
    process.env.VLUE_PERSONAL_VAULT_DIR ||
    path.join(process.cwd(), "uploads", "personal-vault")
  );
}

export function sanitizeVaultFileName(name: string, fallback = "file.bin") {
  const base = String(name || fallback)
    .replace(/[/\\?%*:|"<>]/g, "_")
    .trim();
  return base || fallback;
}

export function markMailReceivedFileName(name: string) {
  const raw = sanitizeVaultFileName(name, "attachment.bin");
  const dot = raw.lastIndexOf(".");
  if (dot > 0) return `${raw.slice(0, dot)}[메일수신]${raw.slice(dot)}`;
  return `${raw}[메일수신]`;
}

export function markPptGeneratedFileName(name: string) {
  let raw = sanitizeVaultFileName(name, "presentation.pptx");
  if (!raw.toLowerCase().endsWith(".pptx")) raw = `${raw}.pptx`;
  const dot = raw.lastIndexOf(".");
  if (dot > 0) return `${raw.slice(0, dot)}[AI PPT]${raw.slice(dot)}`;
  return `${raw}[AI PPT]`;
}

const PPT_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export async function ingestPptVaultBuffer(input: {
  userId: string;
  fileName: string;
  buffer: Buffer;
}) {
  const fileName = markPptGeneratedFileName(input.fileName);
  const id = crypto.randomUUID();
  const objectKey = `personal-vault/${input.userId}/${id}-${fileName}`;
  const storage = resolveStorageProvider();
  const uploaded = await storage.upload({
    key: objectKey,
    contentType: PPT_CONTENT_TYPE,
    contentBase64: input.buffer.toString("base64")
  });

  try {
    const dir = path.join(vaultRootDir(), input.userId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${id}-${fileName}`), input.buffer);
  } catch {
    /* local mirror optional */
  }

  const row = await addAssetFile({
    ownerUserId: input.userId,
    fileName,
    contentType: PPT_CONTENT_TYPE,
    fileSize: input.buffer.length,
    objectKey: uploaded.key || objectKey,
    fileUrl: uploaded.url
  });
  if (!row) throw new Error("AssetFile insert failed");

  return {
    id: row.id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    objectKey: row.object_key,
    contentType: PPT_CONTENT_TYPE,
    fileSize: input.buffer.length,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date().toISOString()
  };
}

const ALLOWED_MAIL_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export function isAllowedMailAttachment(contentType: string, fileName: string) {
  const ct = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (ALLOWED_MAIL_TYPES.has(ct)) return true;
  const lower = fileName.toLowerCase();
  return /\.(pdf|jpe?g|png|webp|gif)$/i.test(lower);
}

export async function ingestVaultBuffer(input: {
  userId: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}) {
  const fileName = sanitizeVaultFileName(input.fileName);
  const contentType = (input.contentType || "application/octet-stream").trim().slice(0, 120);
  if (!isAllowedMailAttachment(contentType, fileName)) {
    throw new Error("UNSUPPORTED_ATTACHMENT_TYPE");
  }

  const id = crypto.randomUUID();
  const objectKey = `personal-vault/${input.userId}/${id}-${fileName}`;
  const storage = resolveStorageProvider();
  const uploaded = await storage.upload({
    key: objectKey,
    contentType,
    contentBase64: input.buffer.toString("base64")
  });

  try {
    const dir = path.join(vaultRootDir(), input.userId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${id}-${fileName}`), input.buffer);
  } catch {
    /* local mirror optional */
  }

  const row = await addAssetFile({
    ownerUserId: input.userId,
    fileName,
    contentType,
    fileSize: input.buffer.length,
    objectKey: uploaded.key || objectKey,
    fileUrl: uploaded.url
  });
  if (!row) throw new Error("AssetFile insert failed");

  return {
    id: row.id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    objectKey: row.object_key,
    contentType,
    fileSize: input.buffer.length,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date().toISOString()
  };
}
