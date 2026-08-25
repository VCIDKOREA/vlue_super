/**
 * 쇼케이스·마이케이스 서버 저장용 슬림 JSON (Pooler egress 방어).
 * 클라이언트 slimShowcaseStyleForPersist 와 동일 계약.
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

const DATA_URL_RE = /^\s*data:/i;
const BLOB_URL_RE = /^\s*blob:/i;

/** 서버 JSONB 상한 (~120KB UTF-8). 초과 시 400 */
export const SHOWCASE_STYLE_MAX_BYTES = 120_000;

export function slimShowcaseStyleForPersist(value: unknown, depth = 0): unknown {
  if (depth > 14 || value == null) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (DATA_URL_RE.test(s) || BLOB_URL_RE.test(s)) return null;
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => slimShowcaseStyleForPersist(item, depth + 1))
      .filter((item) => item != null);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DROP_KEYS.has(k)) continue;
      const next = slimShowcaseStyleForPersist(v, depth + 1);
      if (next === undefined) continue;
      out[k] = next;
    }
    return out;
  }
  return value;
}

/** 피어·공개 응답용 — 재생에 필요한 최소 필드 */
export function slimShowcaseStyleForPublic(value: unknown): unknown {
  const slim = slimShowcaseStyleForPersist(value);
  if (!slim || typeof slim !== "object" || Array.isArray(slim)) return slim;
  const s = slim as Record<string, unknown>;
  const keep: Record<string, unknown> = { v: 2 };
  if (s.pages != null) keep.pages = s.pages;
  if (s.gallery != null) keep.gallery = s.gallery;
  if (s.bgm != null) keep.bgm = s.bgm;
  if (s.richCustom != null) keep.richCustom = s.richCustom;
  if (s.privacyMode != null) keep.privacyMode = s.privacyMode;
  if (s.platformFeed != null) keep.platformFeed = s.platformFeed;
  if (s.commercial != null) keep.commercial = s.commercial;
  if (s.tags != null) keep.tags = s.tags;
  if (s.includeDigitalCard != null) keep.includeDigitalCard = s.includeDigitalCard;
  if (s.showBroadcastName != null) keep.showBroadcastName = s.showBroadcastName;
  return keep;
}

export function utf8ByteLength(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

export function assertShowcaseStyleWithinLimit(value: unknown, label = "style"): void {
  const n = utf8ByteLength(value);
  if (n > SHOWCASE_STYLE_MAX_BYTES) {
    const err = new Error(
      `${label}이 너무 큽니다 (${Math.round(n / 1024)}KB). 이미지 data URL을 제거하고 R2 https URL만 저장하세요.`
    );
    (err as Error & { code?: string; status?: number }).code = "STYLE_TOO_LARGE";
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
}
