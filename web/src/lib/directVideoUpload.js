import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]);
/** Direct Upload — 브라우저→CDN 직행, API 서버 대역폭 0원 (최대 5GB) */
const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

export function validateVideoFile(file) {
  if (!file) throw new Error("영상 파일을 선택해 주세요.");
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  const extOk = /\.(mp4|mov|webm)$/i.test(name);
  if (!ALLOWED_VIDEO_TYPES.has(type) && !extOk) {
    throw new Error("mp4, mov, webm 영상만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("영상은 5GB 이하만 업로드할 수 있습니다.");
  }
  return file;
}

/** @returns {Promise<{ configured: boolean }>} */
export async function fetchVideoUploadStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/media/video-upload/status"));
  const data = await res.json().catch(() => ({}));
  return { configured: Boolean(data.configured) };
}

async function requestVideoUploadUrl({ fileName, contentType, fileSize }) {
  const res = await vlueAuthFetch(apiUrl("/api/media/video-upload-url"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ fileName, contentType, fileSize })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "업로드 URL 발급에 실패했습니다.");
  }
  return data;
}

/**
 * 브라우저 → Cloudflare R2 직접 업로드 (Presigned PUT, API 서버 디스크 미사용)
 * @returns {Promise<string>} public CDN URL
 */
export async function uploadVideoDirectToCdn(file, onProgress) {
  const valid = validateVideoFile(file);
  const contentType = valid.type || "video/mp4";
  const presign = await requestVideoUploadUrl({
    fileName: valid.name,
    contentType,
    fileSize: valid.size
  });

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`CDN 업로드 실패 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했습니다."));
    xhr.open("PUT", presign.uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(valid);
  });

  return presign.publicUrl;
}
