import type { Context } from "hono";
import { jwtVerify } from "jose";

/** 프로덕션에서는 `VLUE_AUTH_STRICT=1` 로 레거시 헤더 인증을 끕니다. */
function allowLegacyUserHeader(): boolean {
  return process.env.VLUE_AUTH_STRICT !== "1";
}

function accessSecretBytes(): Uint8Array {
  const s = process.env.JWT_ACCESS_SECRET?.trim();
  if (s) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_ACCESS_SECRET is required in production.");
  }
  console.warn("[vlue-api] JWT_ACCESS_SECRET 미설정 — 개발용 기본 시크릿을 사용합니다.");
  return new TextEncoder().encode("dev-only-vlue-jwt-access-secret");
}

export async function verifyAccessToken(bearer: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(bearer, accessSecretBytes());
    const sub = String(payload.sub || "").trim();
    return sub || null;
  } catch {
    return null;
  }
}

/** Bearer JWT 우선, 없으면(비엄격 모드) X-VLUE-User-Id. */
export async function resolveRequestUserId(c: Context): Promise<string | null> {
  const raw = c.req.header("Authorization")?.trim();
  const m = raw?.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) {
    const uid = await verifyAccessToken(m[1].trim());
    if (uid) return uid;
    return null;
  }
  if (allowLegacyUserHeader()) {
    const id = c.req.header("X-VLUE-User-Id")?.trim();
    if (id) return id;
  }
  return null;
}

export async function requireRequestUserId(c: Context): Promise<string | null> {
  return resolveRequestUserId(c);
}
