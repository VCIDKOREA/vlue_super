import { prisma } from "../../db/client.js";
import { revokeAllRefreshForUser } from "../authSessions.js";
import { archiveAbusingProtectionOnAccountDelete } from "./abusingProtectionService.js";
import { ensureWithdrawalScheduleSchema } from "./ensureWithdrawalScheduleSchema.js";

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

export type WithdrawUserAccountOptions = {
  /**
   * 영구 추방 — CI 유지로 동일 본인 재가입 차단.
   * 일반/즉시 탈퇴는 CI를 파기해 본인인증 후 신규 가입 가능.
   */
  permanentBan?: boolean;
};

/**
 * 회원 탈퇴 — PII 파기, 구독 해지, 세션 무효화.
 * 일반 탈퇴: CI 파기 → 재가입 시 본인인증부터 다시.
 * 영구 추방: CI 유지 → 동일 본인 재가입 불가.
 */
export async function withdrawUserAccount(
  userId: string,
  opts: WithdrawUserAccountOptions = {}
): Promise<{ ok: true }> {
  await ensureWithdrawalScheduleSchema();
  const permanentBan = Boolean(opts.permanentBan);
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
        cancelReason: permanentBan ? "permanent_ban" : "user_withdrawal",
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
        /* 일반 탈퇴: CI 파기(재가입·재인증 가능). 영구 추방만 CI 유지 */
        ...(permanentBan ? {} : { ciHash: null }),
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
