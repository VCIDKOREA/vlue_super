import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const DEFAULT_BUCKET = "vlue-product-media";
/** 쇼케이스 음원 — R2 Direct Upload (서버 디스크 미경유) */
const MAX_AUDIO_BYTES = 80 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm"
]);
const PRESIGN_TTL_SEC = 60 * 60;

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

export function isShowcaseSoundStorageConfigured() {
  return Boolean(readR2Config());
}

function extForContentType(contentType: string): string {
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("mp4") || contentType.includes("m4a") || contentType.includes("aac"))
    return "m4a";
  return "mp3";
}

export async function createShowcaseSoundUploadUrl(input: {
  userId: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
  /** signature 관리자 업로드 시 prefix */
  prefix?: "user" | "signature";
}) {
  const config = readR2Config();
  if (!config) {
    throw new Error(
      "음원 스토리지(R2)가 설정되지 않았습니다. R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_BASE_URL 을 확인해 주세요."
    );
  }

  const contentType = String(input.contentType || "audio/mpeg").toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("mp3, m4a, wav, ogg, webm 음원만 업로드할 수 있습니다.");
  }

  const fileSize = Number(input.fileSize) || 0;
  if (fileSize > MAX_AUDIO_BYTES) {
    throw new Error("음원은 80MB 이하만 업로드할 수 있습니다.");
  }

  const ext = extForContentType(contentType);
  const safeName = String(input.fileName || `sound.${ext}`)
    .replace(/[^\w.\-가-힣]/g, "_")
    .slice(0, 80);
  const folder = input.prefix === "signature" ? "showcase-bgm/signature" : `showcase-bgm/${input.userId}`;
  const path = `${folder}/${randomUUID()}-${safeName || `sound.${ext}`}`;

  const client = getR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: path,
    ContentType: contentType
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL_SEC });
  const publicUrl = `${config.publicBaseUrl}/${path}`;

  return {
    bucket: config.bucket,
    path,
    uploadUrl,
    publicUrl,
    maxBytes: MAX_AUDIO_BYTES,
    contentType,
    provider: "cloudflare-r2" as const
  };
}
