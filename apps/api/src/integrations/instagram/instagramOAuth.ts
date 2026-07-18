import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getInstagramAppId,
  getInstagramAppSecret,
  getInstagramOAuthRedirectUri
} from "./instagramEnv.js";

const IG_AUTH_BASE = "https://www.instagram.com/oauth/authorize";
const IG_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const IG_GRAPH = "https://graph.instagram.com";
const IG_GRAPH_VERSION = "v22.0";

/** 쇼케이스 미디어 조회에 필요한 최소 권한 */
const IG_SCOPES = "instagram_business_basic";

function oauthSigningSecret(): string {
  const s =
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET 또는 JWT_ACCESS_SECRET이 필요합니다.");
  }
  return "dev-only-vlue-instagram-oauth-secret";
}

/** VLUE userId를 담은 서명 state — 크로스 도메인 쿠키 없이 콜백에서 복원 */
export function createInstagramLinkState(userId: string): string {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("연동할 사용자 ID가 없습니다.");
  const payload = Buffer.from(
    JSON.stringify({
      u: uid,
      exp: Date.now() + 10 * 60 * 1000
    }),
    "utf8"
  ).toString("base64url");
  const sig = createHmac("sha256", oauthSigningSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyInstagramLinkState(state: string): string | null {
  const raw = String(state || "").trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", oauthSigningSecret()).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: string;
      exp?: number;
    };
    if (!json.u || typeof json.exp !== "number" || Date.now() > json.exp) return null;
    return String(json.u).trim() || null;
  } catch {
    return null;
  }
}

export function buildInstagramAuthorizeUrl(state: string): string {
  const clientId = getInstagramAppId();
  if (!clientId) {
    throw new Error("INSTAGRAM_APP_ID가 설정되지 않았습니다.");
  }
  if (!/^\d+$/.test(clientId)) {
    throw new Error(
      "INSTAGRAM_APP_ID 형식이 올바르지 않습니다. Meta 앱 대시보드 → Instagram → Business login settings의 Instagram App ID를 사용하세요."
    );
  }
  const redirectUri = getInstagramOAuthRedirectUri().replace(/\/+$/, "");
  if (!redirectUri) {
    throw new Error("INSTAGRAM_REDIRECT_URI가 비어 있습니다.");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: IG_SCOPES,
    state: String(state || "").trim(),
    /* Meta Business Login 권장 — FB 로그인 혼선·invalid params 완화 */
    enable_fb_login: "0",
    force_authentication: "1"
  });
  return `${IG_AUTH_BASE}?${params.toString()}`;
}

/** Meta가 code 뒤에 붙이는 `#_` 제거 */
export function normalizeInstagramAuthCode(code: string): string {
  return String(code || "")
    .trim()
    .replace(/#_$/, "")
    .replace(/#$/, "");
}

export type InstagramShortLivedToken = {
  accessToken: string;
  /** Instagram-scoped user id from token exchange */
  userId: string;
  permissions: string[];
};

function pickTokenPayload(json: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(json.data) && json.data[0] && typeof json.data[0] === "object") {
    return json.data[0] as Record<string, unknown>;
  }
  return json;
}

export async function exchangeInstagramCodeForShortLivedToken(
  code: string
): Promise<InstagramShortLivedToken> {
  const clientId = getInstagramAppId();
  const clientSecret = getInstagramAppSecret();
  const redirectUri = getInstagramOAuthRedirectUri();
  if (!clientId) throw new Error("INSTAGRAM_APP_ID가 설정되지 않았습니다.");
  if (!clientSecret) throw new Error("INSTAGRAM_APP_SECRET이 설정되지 않았습니다.");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: normalizeInstagramAuthCode(code)
  });

  const res = await fetch(IG_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      (typeof json.error_message === "string" && json.error_message) ||
      (typeof json.error_description === "string" && json.error_description) ||
      (typeof json.error === "string" && json.error) ||
      `Instagram 토큰 발급 실패 (${res.status})`;
    throw new Error(err);
  }

  const data = pickTokenPayload(json);
  const accessToken = typeof data.access_token === "string" ? data.access_token.trim() : "";
  const userId = String(data.user_id ?? "").trim();
  if (!accessToken) throw new Error("Instagram 응답에 access_token이 없습니다.");
  if (!userId) throw new Error("Instagram 응답에 user_id가 없습니다.");

  const permissionsRaw = data.permissions;
  const permissions = Array.isArray(permissionsRaw)
    ? permissionsRaw.map((p) => String(p))
    : String(permissionsRaw || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return { accessToken, userId, permissions };
}

export type InstagramLongLivedToken = {
  accessToken: string;
  expiresIn: number;
};

export async function exchangeInstagramShortLivedForLongLived(
  shortLivedToken: string
): Promise<InstagramLongLivedToken> {
  const clientSecret = getInstagramAppSecret();
  if (!clientSecret) throw new Error("INSTAGRAM_APP_SECRET이 설정되지 않았습니다.");

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: String(shortLivedToken || "").trim()
  });

  const res = await fetch(`${IG_GRAPH}/access_token?${params.toString()}`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errObj = json.error && typeof json.error === "object" ? (json.error as Record<string, unknown>) : null;
    const err =
      (errObj && typeof errObj.message === "string" && errObj.message) ||
      (typeof json.error_message === "string" && json.error_message) ||
      `Instagram 장기 토큰 교환 실패 (${res.status})`;
    throw new Error(err);
  }

  const accessToken = typeof json.access_token === "string" ? json.access_token.trim() : "";
  if (!accessToken) throw new Error("장기 토큰 응답에 access_token이 없습니다.");
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 60 * 24 * 60 * 60;
  return { accessToken, expiresIn };
}

export type InstagramProfile = {
  /** Instagram professional account id (media endpoint용) */
  igUserId: string;
  /** 토큰 교환 시 app-scoped id (참고용) */
  appScopedUserId: string;
  username: string;
  accountType: string | null;
};

export async function fetchInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const params = new URLSearchParams({
    fields: "user_id,username,account_type",
    access_token: String(accessToken || "").trim()
  });
  const res = await fetch(`${IG_GRAPH}/${IG_GRAPH_VERSION}/me?${params.toString()}`);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errObj = json.error && typeof json.error === "object" ? (json.error as Record<string, unknown>) : null;
    const err =
      (errObj && typeof errObj.message === "string" && errObj.message) ||
      `Instagram 프로필 조회 실패 (${res.status})`;
    throw new Error(err);
  }

  // /me 응답이 data 배열인 경우와 flat 객체인 경우 모두 처리
  const row =
    Array.isArray(json.data) && json.data[0] && typeof json.data[0] === "object"
      ? (json.data[0] as Record<string, unknown>)
      : json;

  const igUserId = String(row.user_id || row.id || "").trim();
  const username = String(row.username || "").trim();
  if (!igUserId) throw new Error("Instagram 계정 ID를 확인할 수 없습니다.");

  return {
    igUserId,
    appScopedUserId: String(row.id || igUserId).trim(),
    username: username || igUserId,
    accountType: typeof row.account_type === "string" ? row.account_type : null
  };
}

export type InstagramMediaItem = {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  /** 캐러셀 자식 (IMAGE/VIDEO) — 최대 20 */
  children: InstagramMediaItem[];
};

function mapMediaRow(row: Record<string, unknown>): InstagramMediaItem | null {
  const id = String(row.id || "").trim();
  if (!id) return null;
  const childrenRaw =
    row.children && typeof row.children === "object" && Array.isArray((row.children as { data?: unknown }).data)
      ? ((row.children as { data: unknown[] }).data || [])
      : [];
  const children = childrenRaw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => mapMediaRow(c))
    .filter((c): c is InstagramMediaItem => !!c)
    .slice(0, 20);

  return {
    id,
    caption: typeof row.caption === "string" ? row.caption : null,
    mediaType: String(row.media_type || "").trim() || "UNKNOWN",
    mediaUrl: typeof row.media_url === "string" ? row.media_url : null,
    thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    permalink: typeof row.permalink === "string" ? row.permalink : null,
    timestamp: typeof row.timestamp === "string" ? row.timestamp : null,
    children
  };
}

export async function fetchInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit = 40
): Promise<InstagramMediaItem[]> {
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url,timestamp}";
  const params = new URLSearchParams({
    fields,
    access_token: String(accessToken || "").trim(),
    limit: String(Math.min(Math.max(limit, 1), 50))
  });
  const res = await fetch(
    `${IG_GRAPH}/${IG_GRAPH_VERSION}/${encodeURIComponent(igUserId)}/media?${params.toString()}`
  );
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errObj = json.error && typeof json.error === "object" ? (json.error as Record<string, unknown>) : null;
    const err =
      (errObj && typeof errObj.message === "string" && errObj.message) ||
      `Instagram 미디어 조회 실패 (${res.status})`;
    throw new Error(err);
  }

  const rows = Array.isArray(json.data) ? json.data : [];
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => mapMediaRow(row))
    .filter((m): m is InstagramMediaItem => !!m && !!m.id);
}

/** 선택 id 목록의 media_url 재조회 (만료 URL 갱신) */
export async function resolveInstagramMediaByIds(
  accessToken: string,
  ids: string[]
): Promise<InstagramMediaItem[]> {
  const token = String(accessToken || "").trim();
  const unique = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))].slice(0, 40);
  const out: InstagramMediaItem[] = [];
  for (const id of unique) {
    const fields =
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url,timestamp}";
    const params = new URLSearchParams({ fields, access_token: token });
    const res = await fetch(`${IG_GRAPH}/${IG_GRAPH_VERSION}/${encodeURIComponent(id)}?${params.toString()}`);
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) continue;
    const mapped = mapMediaRow(json);
    if (mapped) out.push(mapped);
  }
  return out;
}
