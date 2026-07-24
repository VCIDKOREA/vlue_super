import { fitImageFileOrThrow, IMAGE_FIT_LOGO } from "./fitImageFile.js";

/**
 * @param {File} file
 * @returns {Promise<{ dataUrl: string; fileName: string }>}
 */
export async function readImageFileAsDataUrl(file) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("PNG, JPG, WebP 이미지만 업로드할 수 있습니다.");
  }
  const { dataUrl, fileName } = await fitImageFileOrThrow(file, {
    ...IMAGE_FIT_LOGO,
    maxBytes: 1_500_000,
    fileNamePrefix: "logo"
  });
  return { dataUrl, fileName: fileName || file.name };
}
