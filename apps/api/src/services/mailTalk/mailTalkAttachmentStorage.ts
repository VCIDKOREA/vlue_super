import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const DEFAULT_BUCKET = "vlue-product-media";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const PRESIGN_TTL_SEC = 60 * 60;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip"
]);

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

function readR2Config(): R2Config | null {
  const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucket = String(process.env.R2_BUCKET_NAME || DEFAULT_BUCKET).trim();
  const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

function getR2Client(config: R2Config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

export function isMailTalkAttachmentStorageConfigured() {
  return Boolean(readR2Config());
}

export async function createMailTalkAttachmentUploadUrl(input: {
  userId: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
}) {
  const config = readR2Config();
  if (!config) {
    throw new Error("첨부파일 스토리지(R2)가 설정되지 않았습니다.");
  }

  const contentType = String(input.contentType || "application/octet-stream").toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("지원하지 않는 파일 형식입니다. (이미지, PDF, 문서, ZIP)");
  }

  const fileSize = Number(input.fileSize) || 0;
  if (fileSize > MAX_ATTACHMENT_BYTES) {
    throw new Error("첨부파일은 25MB 이하만 업로드할 수 있습니다.");
  }

  const safeName = String(input.fileName || "attachment.bin")
    .replace(/[^\w.\-가-힣]/g, "_")
    .slice(0, 80);
  const path = `mail-talk/${input.userId}/${randomUUID()}-${safeName || "file.bin"}`;

  const client = getR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: path,
    ContentType: contentType
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL_SEC });
  const publicUrl = `${config.publicBaseUrl}/${path}`;

  return {
    uploadUrl,
    publicUrl,
    contentType,
    maxBytes: MAX_ATTACHMENT_BYTES,
    provider: "cloudflare-r2" as const
  };
}
