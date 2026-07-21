/**
 * Google Web Risk Lookup API — uris.search
 * @see https://cloud.google.com/web-risk/docs/lookup-api
 */

const DEFAULT_ENDPOINT = "https://webrisk.googleapis.com/v1/uris:search";

/** Lookup API에서 검사할 위협 목록 */
export const WEB_RISK_THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "SOCIAL_ENGINEERING_EXTENDED_COVERAGE"
] as const;

export const WEB_RISK_BLOCK_MESSAGE = "유해·불법 링크는 등록할 수 없습니다.";

export type WebRiskLookupResult = {
  ok: boolean;
  safe: boolean;
  uri: string;
  threatTypes: string[];
  /** API 키 미설정 등으로 검사를 건너뜀 (개발 편의) */
  skipped?: boolean;
  error?: string;
  message?: string;
};

function getApiKey(): string {
  return String(process.env.GOOGLE_WEBRISK_API_KEY || process.env.WEBRISK_API_KEY || "").trim();
}

function getEndpoint(): string {
  return String(process.env.GOOGLE_WEBRISK_LOOKUP_URL || DEFAULT_ENDPOINT).trim() || DEFAULT_ENDPOINT;
}

function allowSkipWhenUnconfigured(): boolean {
  if (String(process.env.VLUE_WEBRISK_FAIL_OPEN || "").trim() === "1") return true;
  return process.env.NODE_ENV !== "production";
}

/** http(s) 스키마 보정 */
export function normalizeCheckUri(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

function isValidHttpUrl(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Lookup API (`uris.search`)로 URI 유해성 검사.
 * threat 매칭이 있으면 safe=false.
 */
export async function lookupUriWithWebRisk(rawUri: string): Promise<WebRiskLookupResult> {
  const uri = normalizeCheckUri(rawUri);
  if (!uri || !isValidHttpUrl(uri)) {
    return {
      ok: false,
      safe: false,
      uri: uri || String(rawUri || "").trim(),
      threatTypes: [],
      error: "유효한 http(s) URL을 입력해 주세요."
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    if (allowSkipWhenUnconfigured()) {
      console.warn("[webrisk] GOOGLE_WEBRISK_API_KEY unset — skipping lookup (dev/fail-open)");
      return { ok: true, safe: true, uri, threatTypes: [], skipped: true };
    }
    return {
      ok: false,
      safe: false,
      uri,
      threatTypes: [],
      error: "링크 안전성 검사 서비스가 설정되지 않았습니다."
    };
  }

  const params = new URLSearchParams();
  params.set("uri", uri);
  params.set("key", apiKey);
  for (const t of WEB_RISK_THREAT_TYPES) {
    params.append("threatTypes", t);
  }

  const endpoint = getEndpoint();
  let res: Response;
  try {
    res = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Web Risk 요청 실패";
    return {
      ok: false,
      safe: false,
      uri,
      threatTypes: [],
      error: `링크 안전성 검사를 완료할 수 없습니다. (${msg})`
    };
  }

  const data = (await res.json().catch(() => ({}))) as {
    threat?: { threatTypes?: string[]; expireTime?: string };
    error?: { message?: string; status?: string };
  };

  if (!res.ok) {
    const apiMsg = data?.error?.message || `Web Risk HTTP ${res.status}`;
    return {
      ok: false,
      safe: false,
      uri,
      threatTypes: [],
      error: `링크 안전성 검사를 완료할 수 없습니다. (${apiMsg})`
    };
  }

  const threatTypes = Array.isArray(data?.threat?.threatTypes)
    ? data.threat.threatTypes.map(String).filter(Boolean)
    : [];

  if (threatTypes.length > 0) {
    return {
      ok: true,
      safe: false,
      uri,
      threatTypes,
      message: WEB_RISK_BLOCK_MESSAGE
    };
  }

  return { ok: true, safe: true, uri, threatTypes: [] };
}
