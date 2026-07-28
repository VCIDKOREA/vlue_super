import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

/**
 * 쇼케이스 style JSON → R2 (CDN). DB Pooler egress 우회용 공개 읽기.
 */

const DEFAULT_BUCKET = "vlue-product-media";
const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

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

export function isShowcaseStyleCdnConfigured() {
  return Boolean(readR2Config());
}

/**
 * @returns public https URL or null if R2 미설정/실패
 */
export async function uploadShowcaseStyleJsonToR2(input: {
  userId: string;
  caseId?: string;
  style: unknown;
}): Promise<string | null> {
  const config = readR2Config();
  if (!config) return null;
  try {
    const body = JSON.stringify({ v: 2, style: input.style, at: new Date().toISOString() });
    const key = `showcase-style/${input.userId}/${input.caseId || randomUUID()}.json`;
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: "application/json; charset=utf-8",
        CacheControl: CACHE_CONTROL
      })
    );
    return `${config.publicBaseUrl}/${key}`;
  } catch (e) {
    console.warn("[showcase-style-cdn] upload failed", e);
    return null;
  }
}
