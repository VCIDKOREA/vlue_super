import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import {
  fitImageFile,
  IMAGE_FIT_PHOTO,
  IMAGE_FIT_LOGO,
  IMAGE_FIT_AVATAR,
  IMAGE_FIT_COVER,
  IMAGE_FIT_SHOWCASE,
  IMAGE_FIT_CHAT,
  IMAGE_FIT_STORE,
  IMAGE_FIT_DOC,
  IMAGE_FIT_GENERAL
} from "./fitImageFile.js";

/**
 * 플랫폼 공통 이미지 업로드
 * 1) 클라이언트 리사이즈·압축 (원본 10~20MB 직행 방지)
 * 2) 백엔드에 Presigned URL만 요청
 * 3) 브라우저 → R2 직행 PUT (API 대역폭 0)
 */

const FIT_BY_KIND = {
  photo: IMAGE_FIT_PHOTO,
  logo: IMAGE_FIT_LOGO,
  avatar: IMAGE_FIT_AVATAR,
  cover: IMAGE_FIT_COVER,
  showcase: IMAGE_FIT_SHOWCASE,
  chat: IMAGE_FIT_CHAT,
  store: IMAGE_FIT_STORE,
  marketing: IMAGE_FIT_COVER,
  doc: IMAGE_FIT_DOC,
  general: IMAGE_FIT_GENERAL
};

export function dataUrlToBlob(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("이미지 형식이 올바르지 않습니다.");
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function fitRulesForKind(kind = "general") {
  return FIT_BY_KIND[kind] || IMAGE_FIT_GENERAL;
}

export async function fetchImageUploadStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/media/image-upload/status"));
  const data = await res.json().catch(() => ({}));
  return { configured: Boolean(data.configured), kinds: data.kinds || [] };
}

export async function requestMediaImageUploadUrl({ kind, fileName, contentType, fileSize }) {
  const res = await vlueAuthFetch(apiUrl("/api/media/image-upload-url"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ kind, fileName, contentType, fileSize })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "업로드 URL 발급 실패");
    err.code = res.status === 503 ? "R2_NOT_CONFIGURED" : "PRESIGN_FAILED";
    err.payload = data;
    throw err;
  }
  return data;
}

/**
 * data URL / File → R2 https URL
 * 재설치 복원용 — 로컬에만 있던 사진을 서버에 올린다.
 */
export async function uploadDataUrlToMediaCdn(dataUrl, kind = "photo") {
  const raw = String(dataUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("blob:")) {
    throw new Error("blob URL은 업로드할 수 없습니다. 파일을 다시 선택해 주세요.");
  }
  if (!raw.startsWith("data:")) {
    throw new Error("지원하지 않는 이미지 형식입니다.");
  }
  const blob = dataUrlToBlob(raw);
  const mime = blob.type || "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const signed = await requestMediaImageUploadUrl({
    kind,
    fileName: `${kind}.${ext}`,
    contentType: mime,
    fileSize: blob.size
  });
  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": signed.contentType || mime },
    body: blob
  });
  if (!put.ok) {
    throw new Error(`R2 업로드 실패 (${put.status})`);
  }
  return String(signed.publicUrl || "").trim();
}

/** http면 그대로, data면 R2 업로드, 그 외 빈 문자열 */
export async function ensureHttpMediaUrl(url, kind = "photo") {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("data:")) return uploadDataUrlToMediaCdn(u, kind);
  return "";
}

/**
 * @param {File|Blob} file
 * @param {string} [kind='general']
 * @param {{ allowDataUrlFallback?: boolean, fitRules?: object }} [opts]
 * @returns {Promise<{ ok:true, url:string, fileName:string, mime:string, via:'r2'|'dataUrl', dataUrl?:string, uploadWarning?:string } | { ok:false, error:string }>}
 */
export async function compressAndUploadMediaImage(file, kind = "general", opts = {}) {
  const allowDataUrlFallback = opts.allowDataUrlFallback === true;
  const rules = opts.fitRules || fitRulesForKind(kind);

  const fitted = await fitImageFile(file, {
    ...rules,
    fileNamePrefix: rules.fileNamePrefix || kind
  });
  if (!fitted.ok) return fitted;

  try {
    const blob = dataUrlToBlob(fitted.dataUrl);
    const signed = await requestMediaImageUploadUrl({
      kind,
      fileName: fitted.fileName,
      contentType: fitted.mime || blob.type || "image/jpeg",
      fileSize: blob.size
    });
    const put = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": signed.contentType || blob.type || "image/jpeg" },
      body: blob
    });
    if (!put.ok) {
      throw new Error(`R2 업로드 실패 (${put.status})`);
    }
    return {
      ok: true,
      url: String(signed.publicUrl || "").trim(),
      fileName: fitted.fileName,
      mime: fitted.mime,
      via: "r2",
      dataUrl: fitted.dataUrl
    };
  } catch (e) {
    if (!allowDataUrlFallback) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "이미지 업로드에 실패했습니다."
      };
    }
    if (e?.code === "R2_NOT_CONFIGURED") {
      return {
        ok: true,
        url: fitted.dataUrl,
        fileName: fitted.fileName,
        mime: fitted.mime,
        via: "dataUrl",
        dataUrl: fitted.dataUrl
      };
    }
    return {
      ok: true,
      url: fitted.dataUrl,
      fileName: fitted.fileName,
      mime: fitted.mime,
      via: "dataUrl",
      dataUrl: fitted.dataUrl,
      uploadWarning: e instanceof Error ? e.message : "클라우드 업로드에 실패해 기기에만 저장합니다."
    };
  }
}

/** fitImageFileOrThrow 스타일 — 실패 시 throw, 성공 시 { url, dataUrl, via, ... } */
export async function compressAndUploadMediaImageOrThrow(file, kind = "general", opts = {}) {
  const result = await compressAndUploadMediaImage(file, kind, opts);
  if (!result.ok) throw new Error(result.error || "이미지 업로드 실패");
  return result;
}
