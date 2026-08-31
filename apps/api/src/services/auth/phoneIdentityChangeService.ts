import { randomUUID } from "node:crypto";
import { prisma } from "../../db/client.js";
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

function buffersEqual(a: Uint8Array | null | undefined, b: Uint8Array): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export class PhoneIdentityError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * 로그인 상태에서 PASS 본인인증으로 계정 휴대폰 번호를 갱신한다.
 * CI가 동일한 경우에만 허용 — 신원은 유지하고 번호만 변경.
 */
export async function changePhoneWithIdentity(opts: {
  impUid: string;
  sessionUserId: string;
}): Promise<{ ok: true; phoneE164: string }> {
  const impUid = String(opts.impUid || "").trim();
  const sessionUserId = String(opts.sessionUserId || "").trim();
  if (!impUid) throw new PhoneIdentityError("본인인증이 필요합니다.");
  if (!sessionUserId) throw new PhoneIdentityError("로그인이 필요합니다.", 401);

  const impKey = requireEnv("PORTONE_API_KEY");
  const impSecret = requireEnv("PORTONE_API_SECRET");
  const parsed = await fetchAndParseIamportCertification(impUid, impKey, impSecret);
  const newPhone = String(parsed.phoneE164 || "").trim();
  if (!newPhone) throw new PhoneIdentityError("인증된 휴대폰 번호를 확인하지 못했습니다.");

  const replayHash = hashOpaqueToken(`phone-id:${impUid}`);
  const replay = await prisma.passwordResetToken.findUnique({ where: { tokenHash: replayHash } });
  if (replay?.usedAt) {
    throw new PhoneIdentityError("이미 사용된 본인인증입니다. 다시 인증해 주세요.", 400);
  }

  const me = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, ciHash: true, phoneE164: true, legalName: true, status: true, identityVerified: true }
  });
  if (!me) throw new PhoneIdentityError("로그인이 필요합니다.", 401);
  if (me.status === "DELETED") throw new PhoneIdentityError("탈퇴한 계정입니다.", 403);

  const ciPrisma = toPrismaBytes(hashCiUniqueKey(parsed.ciUniqueKey));
  const ciOk = buffersEqual(me.ciHash as Uint8Array | null, ciPrisma);
  if (!ciOk) {
    throw new PhoneIdentityError(
      "본인인증 정보가 이 계정과 일치하지 않습니다. 가입 시 사용한 신원으로 인증해 주세요.",
      403
    );
  }

  if (me.phoneE164 === newPhone) {
    throw new PhoneIdentityError("현재 등록된 번호와 동일합니다.", 400);
  }

  const takenUser = await prisma.user.findFirst({
    where: { phoneE164: newPhone, id: { not: me.id } },
    select: { id: true }
  });
  if (takenUser) throw new PhoneIdentityError("이미 다른 계정에 등록된 번호입니다.", 409);

  const takenCard = await prisma.businessCard.findFirst({
    where: { phoneE164: newPhone, userId: { not: me.id } },
    select: { id: true }
  });
  if (takenCard) throw new PhoneIdentityError("이미 다른 계정에 등록된 번호입니다.", 409);

  const oldPhone = String(me.phoneE164 || "").trim();
  const legalName = String(me.legalName || "").trim();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: me.id },
      data: {
        phoneE164: newPhone,
        portoneIdentityId: impUid,
        identityVerified: true,
        identityVerifiedAt: new Date()
      }
    });

    const mobileCard = oldPhone
      ? await tx.businessCard.findFirst({
          where: {
            userId: me.id,
            OR: [{ phoneE164: oldPhone }, { kind: "mobile" }]
          },
          orderBy: { createdAt: "asc" }
        })
      : await tx.businessCard.findFirst({
          where: { userId: me.id, kind: "mobile" },
          orderBy: { createdAt: "asc" }
        });

    if (mobileCard) {
      await tx.businessCard.update({
        where: { id: mobileCard.id },
        data: {
          phoneE164: newPhone,
          kind: "mobile",
          verificationStatus: "approved",
          ...(legalName ? { displayName: legalName } : {})
        }
      });
    } else {
      try {
        await tx.businessCard.create({
          data: {
            userId: me.id,
            kind: "mobile",
            phoneE164: newPhone,
            displayName: legalName,
            verificationStatus: "approved",
            isPremiumLine: false
          }
        });
      } catch {
        /* unique 충돌 등 */
      }
    }

    try {
      await tx.verificationLog.create({
        data: {
          id: randomUUID(),
          userId: me.id,
          action: "phone_change",
          detail: { from: oldPhone || null, to: newPhone, impUid },
          outcome: "success"
        }
      });
    } catch {
      /* ignore */
    }

    await tx.passwordResetToken.upsert({
      where: { tokenHash: replayHash },
      create: {
        id: randomUUID(),
        userId: me.id,
        tokenHash: replayHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: new Date()
      },
      update: { usedAt: new Date(), userId: me.id }
    });
  });

  return { ok: true, phoneE164: newPhone };
}
