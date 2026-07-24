import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const DEFAULT_BUCKET = "vlue-product-media";
/** Direct Upload — API 서버 디스크 미경유, Cloudflare R2 CDN 직행 (최대 5GB, egress $0) */
const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]);
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

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }

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

export function isDirectVideoStorageConfigured() {
  return Boolean(readR2Config());
}

export async function createDirectVideoUploadUrl(input: {
  userId: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
}) {
  const config = readR2Config();
  if (!config) {
    throw new Error(
      "외부 스토리지가 설정되지 않았습니다. R2 환경변수를 확인하거나 YouTube/Vimeo 링크를 사용해 주세요."
    );
  }

  const contentType = String(input.contentType || "video/mp4").toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("mp4, mov, webm 영상만 업로드할 수 있습니다.");
  }

  const fileSize = Number(input.fileSize) || 0;
  if (fileSize > MAX_VIDEO_BYTES) {
    throw new Error("영상은 5GB 이하만 업로드할 수 있습니다.");
  }

  const ext = contentType.includes("quicktime")
    ? "mov"
    : contentType.includes("webm")
      ? "webm"
      : "mp4";
  const safeName = String(input.fileName || `video.${ext}`)
    .replace(/[^\w.\-가-힣]/g, "_")
    .slice(0, 80);
  const path = `product-videos/${input.userId}/${randomUUID()}-${safeName || `video.${ext}`}`;

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
    maxBytes: MAX_VIDEO_BYTES,
    contentType,
    provider: "cloudflare-r2" as const
  };
}
