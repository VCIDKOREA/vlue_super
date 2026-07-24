import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

/**
 * 플랫폼 공통 이미지 Presigned PUT
 * — API는 파일 바이트를 받지 않고 R2 임시 URL만 발급
 * — 클라이언트는 업로드 전 리사이즈·압축 후 직행 PUT
 */

const DEFAULT_BUCKET = "vlue-product-media";
/** 클라이언트 압축 후 상한 (원본 10~20MB 직행 방지) */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const PRESIGN_TTL_SEC = 60 * 30;

/** CDN 장기 캐시 — 동일 키는 immutable */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export const IMAGE_UPLOAD_KINDS = [
  "photo",
  "logo",
  "avatar",
  "cover",
  "showcase",
  "chat",
  "store",
  "marketing",
  "doc",
  "general"
] as const;

export type ImageUploadKind = (typeof IMAGE_UPLOAD_KINDS)[number];

const KINDS = new Set<string>(IMAGE_UPLOAD_KINDS);

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

export function isDirectImageStorageConfigured() {
  return Boolean(readR2Config());
}

function extForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

function pathPrefixForKind(kind: string): string {
  if (kind === "photo" || kind === "logo") return `bizcard`;
  if (kind === "showcase") return `showcase`;
  if (kind === "chat") return `chat`;
  if (kind === "store") return `store`;
  if (kind === "marketing") return `marketing`;
  if (kind === "doc") return `docs`;
  if (kind === "avatar") return `avatars`;
  if (kind === "cover") return `covers`;
  return `images`;
}

/**
 * Presigned PUT URL 발급 — 서버는 파일 본문을 받지 않음
 */
export async function createDirectImageUploadUrl(input: {
  userId: string;
  kind: ImageUploadKind | string;
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

  const kind = String(input.kind || "general").toLowerCase();
  if (!KINDS.has(kind)) {
    throw new Error(`지원하지 않는 이미지 종류입니다. (${IMAGE_UPLOAD_KINDS.join("|")})`);
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
  const prefix = pathPrefixForKind(kind);
  const path = `${prefix}/${input.userId}/${kind}/${randomUUID()}-${safeName || `${kind}.${ext}`}`;

  const client = getR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: path,
    ContentType: contentType,
    CacheControl: CACHE_CONTROL
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
    cacheControl: CACHE_CONTROL
  };
}
