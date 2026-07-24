import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const DEFAULT_BUCKET = "vlue-product-media";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const PRESIGN_TTL_SEC = 60 * 30;
const KINDS = new Set(["photo", "logo", "avatar", "cover"]);

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

export function isBizcardImageStorageConfigured() {
  return Boolean(readR2Config());
}

function extForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

/**
 * 명함·프로필 이미지 Presigned PUT — 서버는 파일 본문을 받지 않음
 */
export async function createBizcardImageUploadUrl(input: {
  userId: string;
  kind: "photo" | "logo" | "avatar" | "cover";
  fileName: string;
  contentType: string;
  fileSize?: number;
}) {
  const config = readR2Config();
  if (!config) {
    throw new Error(
      "이미지 스토리지(R2)가 설정되지 않았습니다. R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_BASE_URL 을 확인해 주세요."
    );
  }

  const kind = String(input.kind || "photo").toLowerCase();
  if (!KINDS.has(kind)) {
    throw new Error("지원하지 않는 이미지 종류입니다. (photo|logo|avatar|cover)");
  }

  const contentType = String(input.contentType || "image/jpeg").toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("JPEG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
  }

  const fileSize = Number(input.fileSize) || 0;
  if (fileSize > MAX_IMAGE_BYTES) {
    throw new Error("이미지는 8MB 이하만 업로드할 수 있습니다. 클라이언트에서 압축 후 올려 주세요.");
  }

  const ext = extForContentType(contentType);
  const safeName = String(input.fileName || `${kind}.${ext}`)
    .replace(/[^\w.\-가-힣]/g, "_")
    .slice(0, 80);
  const path = `bizcard/${input.userId}/${kind}/${randomUUID()}-${safeName || `${kind}.${ext}`}`;

  const client = getR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: path,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable"
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL_SEC });
  const publicUrl = `${config.publicBaseUrl}/${path}`;

  return {
    bucket: config.bucket,
    path,
    uploadUrl,
    publicUrl,
    maxBytes: MAX_IMAGE_BYTES,
    contentType,
    kind,
    provider: "cloudflare-r2" as const,
    cacheControl: "public, max-age=31536000, immutable"
  };
}
