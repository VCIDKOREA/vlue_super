/**
 * 서버·마이케이스에 올릴 쇼케이스 JSON 경량화.
 * - data:/blob: 제거
 * - 편집 전용 dataUrl 필드 제거
 * - https URL·텍스트·레이아웃만 유지 (CDN/R2 패턴)
 */

const DROP_KEYS = new Set([
  "photoDataUrl",
  "logoDataUrl",
  "docDataUrl",
  "kakaoFeedBgDataUrl",
  "dataUrl",
  "previewUrl",
  "localPreviewUrl",
  "blobUrl",
  "file",
  "rawFile",
  "uploadWarning"
]);

/**
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {unknown}
 */
export function slimShowcaseStyleForPersist(value, depth = 0) {
  if (depth > 14 || value == null) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (s.startsWith("data:") || s.startsWith("blob:")) return null;
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => slimShowcaseStyleForPersist(item, depth + 1))
      .filter((item) => item != null);
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (DROP_KEYS.has(k)) continue;
      const next = slimShowcaseStyleForPersist(v, depth + 1);
      if (next === undefined) continue;
      out[k] = next;
    }
    return out;
  }
  return value;
}
