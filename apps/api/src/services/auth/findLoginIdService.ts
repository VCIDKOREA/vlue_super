import { randomUUID } from "node:crypto";
import { prisma } from "../../db/client.js";
import {
  fetchAndParseIamportCertification,
  hashCiUniqueKey
} from "../../integrations/portone/iamportCert.js";
import { hashOpaqueToken } from "../authSessions.js";
import { consumeVerifiedEmailTicket } from "../email/emailAuthCodeService.js";

function toPrismaBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  return new Uint8Array(ab);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v.replace(/^["']|["']$/g, "").trim();
}

export class FindLoginIdError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function maskPublicHandle(raw: string | null | undefined): string {
  const h = String(raw || "").replace(/^@/, "").trim();
  if (!h) return "";
  if (h.length <= 2) return `${h[0] || "*"}*`;
  if (h.length <= 4) return `${h.slice(0, 1)}${"*".repeat(h.length - 2)}${h.slice(-1)}`;
  const mid = Math.max(1, h.length - 3);
  return `${h.slice(0, 2)}${"*".repeat(Math.min(6, mid))}${h.slice(-1)}`;
}

async function resolveUserFromCert(parsed: { ciUniqueKey: string; phoneE164?: string | null }) {
  const ciPrisma = toPrismaBytes(hashCiUniqueKey(parsed.ciUniqueKey));
  const byCi = await prisma.user.findFirst({
    where: { ciHash: { equals: ciPrisma } },
    select: { id: true, publicHandle: true, status: true }
  });
  if (byCi) return byCi;
  const phone = String(parsed.phoneE164 || "").trim();
  if (!phone) return null;
  return prisma.user.findFirst({
    where: { phoneE164: phone, identityVerified: true },
    select: { id: true, publicHandle: true, status: true }
  });
}

/** PASS 본인인증으로 가입 아이디(일부 마스킹) 조회 */
export async function findLoginIdWithIdentity(impUid: string): Promise<{ ok: true; loginId: string }> {
  const uid = String(impUid || "").trim();
  if (!uid) throw new FindLoginIdError("본인인증이 필요합니다.");

  const impKey = requireEnv("PORTONE_API_KEY");
  const impSecret = requireEnv("PORTONE_API_SECRET");
  const parsed = await fetchAndParseIamportCertification(uid, impKey, impSecret);

  const replayHash = hashOpaqueToken(`find-id:${uid}`);
  const replay = await prisma.passwordResetToken.findUnique({ where: { tokenHash: replayHash } });
  if (replay?.usedAt) throw new FindLoginIdError("이미 사용된 본인인증입니다. 다시 인증해 주세요.", 400);

  const user = await resolveUserFromCert(parsed);
  if (!user) throw new FindLoginIdError("본인인증과 일치하는 가입 계정을 찾지 못했습니다.", 404);
  if (user.status === "DELETED") throw new FindLoginIdError("탈퇴한 계정입니다.", 403);

  const loginId = maskPublicHandle(user.publicHandle);
  if (!loginId) throw new FindLoginIdError("등록된 아이디를 찾지 못했습니다.", 404);

  await prisma.passwordResetToken.upsert({
    where: { tokenHash: replayHash },
    create: {
      id: randomUUID(),
      userId: user.id,
      tokenHash: replayHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      usedAt: new Date()
    },
    update: { usedAt: new Date(), userId: user.id }
  });

  return { ok: true, loginId };
}

/** 이메일 인증 토큰으로 가입 아이디(일부 마스킹) 조회 */
export async function findLoginIdWithEmailToken(token: string): Promise<{ ok: true; loginId: string }> {
  const verified = await consumeVerifiedEmailTicket(token, { purpose: "find_id" });
  const userId = String(verified.userId || "").trim();
  if (!userId) throw new FindLoginIdError("이메일 인증이 올바르지 않습니다.", 400);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicHandle: true, status: true }
  });
  if (!user) throw new FindLoginIdError("등록된 아이디를 찾지 못했습니다.", 404);
  if (user.status === "DELETED") throw new FindLoginIdError("탈퇴한 계정입니다.", 403);

  const loginId = maskPublicHandle(user.publicHandle);
  if (!loginId) throw new FindLoginIdError("등록된 아이디를 찾지 못했습니다.", 404);
  return { ok: true, loginId };
}
