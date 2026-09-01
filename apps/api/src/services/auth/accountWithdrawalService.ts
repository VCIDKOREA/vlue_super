import { prisma } from "../../db/client.js";
import { revokeAllRefreshForUser } from "../authSessions.js";
import { archiveAbusingProtectionOnAccountDelete } from "./abusingProtectionService.js";

export class AccountWithdrawalError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "WITHDRAWAL_FAILED") {
    super(message);
    this.name = "AccountWithdrawalError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function tombstoneHandle(userId: string): string {
  const compact = userId.replace(/-/g, "").slice(0, 20);
  return `del_${compact}`;
}

/**
 * 회원 탈퇴 — PII 파기, 구독 해지, 세션 무효화, 재가입 방지 로그 보관
 */
export async function withdrawUserAccount(userId: string): Promise<{ ok: true }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, role: true, publicHandle: true }
  });

  if (!user) {
    throw new AccountWithdrawalError("계정을 찾을 수 없습니다.", 404, "USER_NOT_FOUND");
  }
  if (user.status === "DELETED") {
    throw new AccountWithdrawalError("이미 탈퇴 처리된 계정입니다.", 409, "ALREADY_DELETED");
  }
  if (user.role === "admin") {
    throw new AccountWithdrawalError("관리자 계정은 앱에서 탈퇴할 수 없습니다.", 403, "ADMIN_BLOCKED");
  }

  await archiveAbusingProtectionOnAccountDelete(userId);

  const now = new Date();
  const handle = tombstoneHandle(userId);

  await prisma.$transaction(async (tx) => {
    await tx.userSubscription.updateMany({
      where: { userId, status: "active" },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelReason: "user_withdrawal",
        nextChargeAt: null
      }
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        status: "DELETED",
        accountStatus: "suspended",
        email: null,
        phoneE164: null,
        publicHandle: handle,
        passwordHash: null,
        legalName: null,
        legalNameLockedAt: null,
        identityVerified: false,
        identityVerifiedAt: null,
        portoneIdentityId: null,
        ciHash: null,
        birthDate: null,
        gender: null,
        nickChat: null,
        nickFeed: null,
        socialProvider: null,
        socialId: null,
        isVerified: false,
        withdrawalScheduledAt: null,
        withdrawalRequestedAt: null,
        withdrawalMethod: null
      }
    });

    await tx.userDevice.deleteMany({ where: { userId } });
    await tx.authRefreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now }
    });
  });

  await revokeAllRefreshForUser(userId);

  return { ok: true };
}
