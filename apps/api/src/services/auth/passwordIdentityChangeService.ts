import { randomUUID } from "node:crypto";
import { prisma } from "../../db/client.js";
import { hashPassword } from "../../lib/passwordHash.js";
import { isValidMemberPassword, MEMBER_PASSWORD_INVALID_MESSAGE } from "../../lib/memberPasswordRules.js";
import {
  fetchAndParseIamportCertification,
  hashCiUniqueKey
} from "../../integrations/portone/iamportCert.js";
import { hashOpaqueToken } from "../authSessions.js";

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

export class PasswordIdentityError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function applyNewPassword(userId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.authRefreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now }
    })
  ]);
}

function buffersEqual(a: Uint8Array | null | undefined, b: Uint8Array): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * PASS 본인인증(imp_uid)으로 기존 회원 비밀번호를 교체한다. 신규 가입은 만들지 않는다.
 */
export async function changePasswordWithIdentity(opts: {
  impUid: string;
  newPassword: string;
  sessionUserId?: string | null;
}): Promise<{ ok: true; userId: string }> {
  const impUid = String(opts.impUid || "").trim();
  const newPassword = String(opts.newPassword || "");
  if (!impUid) throw new PasswordIdentityError("본인인증이 필요합니다.");
  if (!isValidMemberPassword(newPassword)) {
    throw new PasswordIdentityError(MEMBER_PASSWORD_INVALID_MESSAGE);
  }

  const impKey = requireEnv("PORTONE_API_KEY");
  const impSecret = requireEnv("PORTONE_API_SECRET");
  const parsed = await fetchAndParseIamportCertification(impUid, impKey, impSecret);
  const ciPrisma = toPrismaBytes(hashCiUniqueKey(parsed.ciUniqueKey));

  const replayHash = hashOpaqueToken(`pw-id:${impUid}`);
  const replay = await prisma.passwordResetToken.findUnique({ where: { tokenHash: replayHash } });
  if (replay?.usedAt) {
    throw new PasswordIdentityError("이미 사용된 본인인증입니다. 다시 인증해 주세요.", 400);
  }

  const byCi = await prisma.user.findFirst({
    where: { ciHash: { equals: ciPrisma } },
    select: { id: true, ciHash: true, phoneE164: true, status: true }
  });
  const byPhone =
    !byCi && parsed.phoneE164
      ? await prisma.user.findFirst({
          where: { phoneE164: parsed.phoneE164, identityVerified: true },
          select: { id: true, ciHash: true, phoneE164: true, status: true }
        })
      : null;
  const matched = byCi || byPhone;
  if (!matched) {
    throw new PasswordIdentityError("본인인증과 일치하는 가입 계정을 찾지 못했습니다.", 404);
  }
  if (matched.status === "DELETED") {
    throw new PasswordIdentityError("탈퇴한 계정입니다.", 403);
  }

  const sessionUserId = String(opts.sessionUserId || "").trim();
  if (sessionUserId) {
    const me = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true, ciHash: true, phoneE164: true }
    });
    if (!me) throw new PasswordIdentityError("로그인이 필요합니다.", 401);
    const ciOk = buffersEqual(me.ciHash as Uint8Array | null, ciPrisma);
    const phoneOk = Boolean(me.phoneE164 && parsed.phoneE164 && me.phoneE164 === parsed.phoneE164);
    if (!ciOk && !phoneOk) {
      throw new PasswordIdentityError("본인인증 정보가 이 계정과 일치하지 않습니다.", 403);
    }
    if (matched.id !== me.id) {
      throw new PasswordIdentityError("본인인증 정보가 이 계정과 일치하지 않습니다.", 403);
    }
  }

  await applyNewPassword(matched.id, newPassword);
  await prisma.passwordResetToken.upsert({
    where: { tokenHash: replayHash },
    create: {
      id: randomUUID(),
      userId: matched.id,
      tokenHash: replayHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      usedAt: new Date()
    },
    update: { usedAt: new Date(), userId: matched.id }
  });

  return { ok: true, userId: matched.id };
}
