import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const BUCKET = "vlue-product-media";
/** Direct Upload — API 서버 디스크 미경유, Supabase CDN 직행 (최대 5GB) */
const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]);

function getAdminClient() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isDirectVideoStorageConfigured() {
  return Boolean(getAdminClient());
}

export async function createDirectVideoUploadUrl(input: {
  userId: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
}) {
  const client = getAdminClient();
  if (!client) {
    throw new Error("외부 스토리지가 설정되지 않았습니다. YouTube/Vimeo 링크를 사용해 주세요.");
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

  const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path, {
    upsert: false
  });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "업로드 URL 발급에 실패했습니다.");
  }

  const baseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const publicUrl = `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

  return {
    bucket: BUCKET,
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl,
    maxBytes: MAX_VIDEO_BYTES,
    contentType
  };
}
