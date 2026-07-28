/**
 * Supabase Postgres egress 방어 — data URL / blob 을 DB JSON에 넣지 않음.
 * (이미지·문서를 JSONB/TEXT에 넣으면 목록·검색마다 대역폭이 폭증함)
 */

const DATA_URL_RE = /^\s*data:/i;
const BLOB_URL_RE = /^\s*blob:/i;
const HTTP_URL_RE = /^\s*https?:\/\//i;

const MEDIA_KEY_RE =
  /^(url|src|href|photoUrl|logoUrl|imageUrl|image_url|shareCoverUrl|thumbnailUrl|coverUrl|avatarUrl|kakaoFeedBgUrl|audioUrl|videoUrl|docUrl|docDataUrl|bgUrl|backgroundUrl)$/i;

/** 클라이언트 편집 전용 — DB JSON에 남기지 않음 */
const DROP_LOCAL_KEY_RE =
  /^(photoDataUrl|logoDataUrl|docDataUrl|kakaoFeedBgDataUrl|dataUrl|previewUrl|localPreviewUrl|blobUrl)$/i;

export function isDataUrl(value: unknown): boolean {
  return typeof value === "string" && DATA_URL_RE.test(value);
}

export function isBlobUrl(value: unknown): boolean {
  return typeof value === "string" && BLOB_URL_RE.test(value);
}

export function isHttpMediaUrl(value: unknown): boolean {
  return typeof value === "string" && HTTP_URL_RE.test(value.trim());
}

/** data:/blob: 이면 이전 https URL 유지, 없으면 null */
export function sanitizeMediaUrl(value: unknown, previous?: unknown): string | null {
  const next = String(value ?? "").trim();
  if (!next) return null;
  if (isDataUrl(next) || isBlobUrl(next)) {
    const prev = String(previous ?? "").trim();
    return isHttpMediaUrl(prev) ? prev : null;
  }
  return next;
}

export function assertNoDataMediaUrl(value: unknown, fieldLabel: string): void {
  if (isDataUrl(value) || isBlobUrl(value)) {
    const err = new Error(
      `${fieldLabel}: data/blob URL은 서버에 저장할 수 없습니다. R2(https) 업로드 후 URL만 저장하세요.`
    );
    (err as Error & { code?: string }).code = "DATA_URL_REJECTED";
    throw err;
  }
}

/**
 * exportSnapshot / showcase style / mycase payload 에서 data URL 미디어 키를 제거·치환.
 * 깊이 제한으로 과도한 재귀 방지.
 */
export function stripDataUrlsFromJson(value: unknown, depth = 0): unknown {
  if (depth > 12 || value == null) return value;
  if (typeof value === "string") {
    if (isDataUrl(value) || isBlobUrl(value)) return null;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripDataUrlsFromJson(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DROP_LOCAL_KEY_RE.test(k)) continue;
      if (MEDIA_KEY_RE.test(k) && (isDataUrl(v) || isBlobUrl(v))) {
        out[k] = null;
        continue;
      }
      out[k] = stripDataUrlsFromJson(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** 스냅샷 병합 시 미디어 필드는 https만 허용 */
export function mergeExportSnapshotMedia(
  prev: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const mediaKeys = [
    "photoUrl",
    "logoUrl",
    "shareCoverUrl",
    "imageUrl",
    "image_url",
    "kakaoFeedBgUrl",
    "kakaoFeedBgDataUrl"
  ] as const;
  const next: Record<string, unknown> = { ...prev, ...patch };
  for (const key of mediaKeys) {
    if (!(key in patch)) continue;
    if (key === "kakaoFeedBgDataUrl") {
      /* data URL 전용 필드는 서버에 남기지 않음 */
      delete next[key];
      continue;
    }
    const sanitized = sanitizeMediaUrl(patch[key], prev[key]);
    if (sanitized) next[key] = sanitized;
    else if (isDataUrl(patch[key]) || isBlobUrl(patch[key])) {
      if (isHttpMediaUrl(prev[key])) next[key] = prev[key];
      else delete next[key];
    }
  }
  return stripDataUrlsFromJson(next) as Record<string, unknown>;
}
