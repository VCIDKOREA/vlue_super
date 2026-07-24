/**
 * 명함 이미지 업로드 — 플랫폼 공통 mediaImageUpload 위임
 * (클라이언트 압축 → Presigned URL → R2 직행 PUT)
 */
export { dataUrlToBlob } from "./mediaImageUpload.js";
import { compressAndUploadMediaImage, requestMediaImageUploadUrl } from "./mediaImageUpload.js";

export async function requestBizcardImageUploadUrl(args) {
  return requestMediaImageUploadUrl(args);
}

/**
 * @param {File|Blob} file
 * @param {'photo'|'logo'|'avatar'|'cover'} [kind='photo']
 */
export async function compressAndUploadBizcardImage(file, kind = "photo") {
  const safeKind = ["photo", "logo", "avatar", "cover"].includes(kind) ? kind : "photo";
  return compressAndUploadMediaImage(file, safeKind);
}
