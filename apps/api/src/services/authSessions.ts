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

/** Android 앱 단일 활성 기기 — 다른 앱 세션만 즉시 만료 */
export async function revokeOtherAndroidAppSessions(
  userId: string,
  keepDeviceToken: string
): Promise<number> {
  const now = new Date();
  const token = String(keepDeviceToken || "").trim();
  const res = await prisma.authRefreshSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      OR: [
        { platform: "app" },
        { clientKind: "android_app" },
        { userAgent: { contains: "VLUE-Android-App" } }
      ],
      ...(token ? { NOT: { deviceToken: token } } : {})
    },
    data: { revokedAt: now }
  });
  await prisma.userDevice.updateMany({
    where: {
      userId,
      platform: "app",
      isVerified: true,
      ...(token ? { NOT: { deviceToken: token } } : {})
    },
    data: { isVerified: false }
  });
  return res.count;
}
