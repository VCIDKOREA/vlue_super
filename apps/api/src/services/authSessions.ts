import { randomBytes, createHash, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { prisma } from "../db/client.js";
import { requestClientIp, requestGeoLabel } from "../lib/authPlatform.js";

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function accessSecretBytes(): Uint8Array {
  const s = process.env.JWT_ACCESS_SECRET?.trim();
  if (s) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_ACCESS_SECRET is required in production.");
  }
  return new TextEncoder().encode("dev-only-vlue-jwt-access-secret");
}

export function hashOpaqueToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export type SessionIssueExtras = {
  clientKind?: string | null;
  deviceToken?: string | null;
  geoLabel?: string | null;
  platform?: string | null;
};

function clientMeta(req: { header: (n: string) => string | undefined }, extras?: SessionIssueExtras) {
  return {
    userAgent: req.header("user-agent")?.slice(0, 512) ?? null,
    lastIp: requestClientIp(req),
    clientKind: extras?.clientKind ?? null,
    deviceToken: extras?.deviceToken ?? null,
    geoLabel: extras?.geoLabel ?? requestGeoLabel(req),
    platform: extras?.platform ?? null
  };
}

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(accessSecretBytes());
}

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSec: number;
};

export async function issueTokenPair(
  userId: string,
  req: { header: (n: string) => string | undefined },
  extras?: SessionIssueExtras
): Promise<TokenPair> {
  const rawRefresh = randomBytes(48).toString("base64url");
  const tokenHash = hashOpaqueToken(rawRefresh);
  const meta = clientMeta(req, extras);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await prisma.authRefreshSession.create({
    data: {
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      ...meta
    }
  });
  const accessToken = await signAccessToken(userId);
  return { accessToken, refreshToken: rawRefresh, accessExpiresInSec: ACCESS_TTL_SEC };
}

export async function refreshWithToken(
  refreshTokenPlain: string,
  req: { header: (n: string) => string | undefined }
): Promise<TokenPair | null> {
  const tokenHash = hashOpaqueToken(refreshTokenPlain.trim());
  const row = await prisma.authRefreshSession.findUnique({ where: { tokenHash } });
  const now = new Date();
  if (!row || row.revokedAt || row.expiresAt <= now) return null;

  const extras: SessionIssueExtras = {
    clientKind: row.clientKind,
    deviceToken: row.deviceToken,
    platform: row.platform,
    geoLabel: requestGeoLabel(req) || row.geoLabel
  };
  await prisma.authRefreshSession.update({
    where: { id: row.id },
    data: { revokedAt: now }
  });

  const rawRefresh = randomBytes(48).toString("base64url");
  const nextHash = hashOpaqueToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  const meta = clientMeta(req, extras);
  await prisma.authRefreshSession.create({
    data: {
      id: randomUUID(),
      userId: row.userId,
      tokenHash: nextHash,
      expiresAt,
      ...meta
    }
  });
  const accessToken = await signAccessToken(row.userId);
  return { accessToken, refreshToken: rawRefresh, accessExpiresInSec: ACCESS_TTL_SEC };
}

export async function revokeRefreshToken(refreshTokenPlain: string): Promise<boolean> {
  const tokenHash = hashOpaqueToken(refreshTokenPlain.trim());
  const row = await prisma.authRefreshSession.findUnique({ where: { tokenHash } });
  if (!row || row.revokedAt) return false;
  await prisma.authRefreshSession.update({
    where: { id: row.id },
    data: { revokedAt: new Date() }
  });
  return true;
}

export async function revokeAllRefreshForUser(userId: string): Promise<number> {
  const res = await prisma.authRefreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
  return res.count;
}

const MOBILE_APP_SESSION_OR = [
  { platform: "app" },
  { platform: "ios" },
  { platform: "android" },
  { clientKind: "android_app" },
  { clientKind: "ios_app" },
  { userAgent: { contains: "VLUE-Android-App" } },
  { userAgent: { contains: "VLUE-iOS-App" } }
] as const;

/** 휴대기기(Android/iOS) 앱 단일 활성 — 다른 모바일 앱 세션만 즉시 만료 (웹 세션은 유지) */
export async function revokeOtherMobileAppSessions(
  userId: string,
  keepDeviceToken: string
): Promise<number> {
  const now = new Date();
  const token = String(keepDeviceToken || "").trim();
  const res = await prisma.authRefreshSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      OR: [...MOBILE_APP_SESSION_OR],
      ...(token ? { NOT: { deviceToken: token } } : {})
    },
    data: { revokedAt: now }
  });
  await prisma.userDevice.updateMany({
    where: {
      userId,
      isVerified: true,
      OR: [{ platform: "app" }, { platform: "ios" }, { platform: "android" }],
      ...(token ? { NOT: { deviceToken: token } } : {})
    },
    data: { isVerified: false }
  });
  return res.count;
}

/** @deprecated use revokeOtherMobileAppSessions */
export async function revokeOtherAndroidAppSessions(
  userId: string,
  keepDeviceToken: string
): Promise<number> {
  return revokeOtherMobileAppSessions(userId, keepDeviceToken);
}

/** 다른 휴대기기 앱에 활성 세션/검증 기기가 있는지 */
export async function listOtherActiveMobileAppDevices(
  userId: string,
  keepDeviceToken: string
): Promise<{ label: string; deviceToken: string | null }[]> {
  const token = String(keepDeviceToken || "").trim();
  const now = new Date();

  const devices = await prisma.userDevice.findMany({
    where: {
      userId,
      isVerified: true,
      OR: [{ platform: "app" }, { platform: "ios" }, { platform: "android" }],
      ...(token ? { NOT: { deviceToken: token } } : {})
    },
    select: { label: true, deviceToken: true, userAgent: true, platform: true },
    orderBy: { updatedAt: "desc" },
    take: 10
  });

  const sessions = await prisma.authRefreshSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
      OR: [...MOBILE_APP_SESSION_OR],
      ...(token ? { NOT: { deviceToken: token } } : {})
    },
    select: { deviceToken: true, userAgent: true, platform: true, clientKind: true },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const byToken = new Map<string, { label: string; deviceToken: string | null }>();

  const labelFromUa = (ua: string | null | undefined, platform: string | null | undefined) => {
    const u = String(ua || "");
    if (u.includes("VLUE-iOS-App") || platform === "ios") return "iOS 앱";
    if (u.includes("VLUE-Android-App") || platform === "android" || platform === "app") {
      return "Android 앱";
    }
    return "모바일 앱";
  };

  for (const d of devices) {
    const key = d.deviceToken || `dev:${d.label || ""}`;
    byToken.set(key, {
      deviceToken: d.deviceToken,
      label: String(d.label || "").trim() || labelFromUa(d.userAgent, d.platform)
    });
  }
  for (const s of sessions) {
    const key = s.deviceToken || `sess:${s.userAgent || ""}`;
    if (byToken.has(key)) continue;
    byToken.set(key, {
      deviceToken: s.deviceToken,
      label: labelFromUa(s.userAgent, s.platform || s.clientKind)
    });
  }

  return [...byToken.values()];
}
