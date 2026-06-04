const MAX_BYTES = 1_500_000;

/**
 * @param {File} file
 * @returns {Promise<{ dataUrl: string; fileName: string }>}
 */
export function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("PNG, JPG, WebP 이미지만 업로드할 수 있습니다."));
      return;
    }
    if (file.size > MAX_BYTES) {
      reject(new Error("로고 파일은 1.5MB 이하여야 합니다."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl.startsWith("data:image/")) {
        reject(new Error("이미지 파일을 읽지 못했습니다."));
        return;
      }
      resolve({ dataUrl, fileName: file.name });
    };
    reader.onerror = () => reject(reader.error || new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}
