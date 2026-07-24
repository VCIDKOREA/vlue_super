import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { fitImageFile, IMAGE_FIT_GENERAL } from "./fitImageFile.js";
import { dataUrlToBlob, requestMediaImageUploadUrl } from "./mediaImageUpload.js";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/syncml+xml",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed"
]);

export function validateMailTalkAttachment(file) {
  if (!file) throw new Error("파일을 선택해 주세요.");
  const type = String(file.type || "application/octet-stream").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  const extOk = /\.(jpe?g|png|webp|gif|pdf|doc|docx|xls|xlsx|txt|zip)$/i.test(name);
  if (!ALLOWED_TYPES.has(type) && !extOk) {
    throw new Error("이미지, PDF, 문서, ZIP 파일만 첨부할 수 있습니다.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("첨부파일은 25MB 이하만 업로드할 수 있습니다.");
  }
  return file;
}

export async function fetchMailTalkAttachmentUploadStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/mail-talk/attachment-upload/status"));
  const data = await res.json().catch(() => ({}));
  return { configured: Boolean(data.configured) };
}

async function requestMailTalkUploadUrl({ fileName, contentType, fileSize }) {
  const res = await vlueAuthFetch(apiUrl("/api/mail-talk/attachment-upload-url"), {
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

async function putToPresignedUrl(uploadUrl, body, contentType, onProgress) {
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
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(body);
  });
}

/**
 * Cloudflare R2 Presigned PUT — 메일톡 첨부
 * 이미지는 업로드 전 클라이언트 압축 (원본 직행 방지)
 * @returns {Promise<string>} public URL
 */
export async function uploadMailTalkAttachment(file, onProgress) {
  const valid = validateMailTalkAttachment(file);
  const isImage = /^image\//i.test(valid.type || "") && !/gif/i.test(valid.type || "");

  if (isImage) {
    const fitted = await fitImageFile(valid, IMAGE_FIT_GENERAL);
    if (!fitted.ok) throw new Error(fitted.error || "이미지 압축에 실패했습니다.");
    try {
      const blob = dataUrlToBlob(fitted.dataUrl);
      const signed = await requestMediaImageUploadUrl({
        kind: "general",
        fileName: fitted.fileName || valid.name,
        contentType: fitted.mime || blob.type || "image/jpeg",
        fileSize: blob.size
      });
      await putToPresignedUrl(
        signed.uploadUrl,
        blob,
        signed.contentType || blob.type || "image/jpeg",
        onProgress
      );
      return signed.publicUrl;
    } catch {
      const blob = dataUrlToBlob(fitted.dataUrl);
      const contentType = fitted.mime || blob.type || "image/jpeg";
      const presign = await requestMailTalkUploadUrl({
        fileName: fitted.fileName || valid.name,
        contentType,
        fileSize: blob.size
      });
      await putToPresignedUrl(presign.uploadUrl, blob, contentType, onProgress);
      return presign.publicUrl;
    }
  }

  const contentType = valid.type || "application/octet-stream";
  const presign = await requestMailTalkUploadUrl({
    fileName: valid.name,
    contentType,
    fileSize: valid.size
  });
  await putToPresignedUrl(presign.uploadUrl, valid, contentType, onProgress);
  return presign.publicUrl;
}
