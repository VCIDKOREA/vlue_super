import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { verifyPassword } from "../../lib/passwordHash.js";
import {
  fetchAndParseIamportCertification,
  hashCiUniqueKey
} from "../../integrations/portone/iamportCert.js";
import { hashOpaqueToken } from "../authSessions.js";
import {
  resolveUserNotifyEmail,
  sendEmailAuthCode,
  verifyEmailAuthCode
} from "../email/emailAuthCodeService.js";
import { listMasterTargets } from "../email/userEmailMappingsStore.js";
import { dissolveFamilyLinksForGuardianWithdrawal } from "../familyProtection/familyProtectionEngine.js";
import {
  AccountWithdrawalError,
  withdrawUserAccount
} from "./accountWithdrawalService.js";
import {
  ensureWithdrawalScheduleSchema
} from "./ensureWithdrawalScheduleSchema.js";

const WITHDRAWAL_GRACE_MS = 24 * 60 * 60 * 1000;

async function ensureWithdrawalDbReady() {
  const ok = await ensureWithdrawalScheduleSchema();
  if (!ok) {
    throw new AccountWithdrawalError(
      "탈퇴 기능 DB 준비 중입니다. 잠시 후 다시 시도해 주세요.",
      503,
      "WITHDRAWAL_SCHEMA_NOT_READY"
    );
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v.replace(/^["']|["']$/g, "").trim();
}

function toPrismaBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  return new Uint8Array(ab);
}

function buffersEqual(a: Uint8Array | null | undefined, b: Uint8Array): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function normalizeAddress(raw: string): string {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function readStoredAddress(userId: string): Promise<string> {
  const card = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { exportSnapshotJson: true }
  });
  const snap =
    card?.exportSnapshotJson && typeof card.exportSnapshotJson === "object"
      ? (card.exportSnapshotJson as Record<string, unknown>)
      : {};
  const parts = [
    snap.addressRoad,
    snap.addressDetail,
    snap.address
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return normalizeAddress(parts.join(" "));
}

async function userRegisteredEmails(userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });
  const direct = String(user?.email || "").trim().toLowerCase();
  if (direct) set.add(direct);
  try {
    const masters = await listMasterTargets(userId);
    for (const row of masters) {
      const e = String(row.email || "").trim().toLowerCase();
      if (e) set.add(e);
    }
  } catch {
    /* ignore */
  }
  return set;
}

async function assertWithdrawalAllowed(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      role: true,
      withdrawalScheduledAt: true
    }
  });
  if (!user) throw new AccountWithdrawalError("계정을 찾을 수 없습니다.", 404, "USER_NOT_FOUND");
  if (user.status === "DELETED") {
    throw new AccountWithdrawalError("이미 탈퇴 처리된 계정입니다.", 409, "ALREADY_DELETED");
  }
  if (user.role === "admin") {
    throw new AccountWithdrawalError("관리자 계정은 앱에서 탈퇴할 수 없습니다.", 403, "ADMIN_BLOCKED");
  }
  if (user.withdrawalScheduledAt) {
    throw new AccountWithdrawalError(
      "탈퇴 예약이 진행 중입니다. 복구하거나 예약 완료를 기다려 주세요.",
      409,
      "WITHDRAWAL_SCHEDULED"
    );
  }
  return user;
}

async function verifyPassMatchesAccount(userId: string, impUid: string) {
  const impKey = requireEnv("PORTONE_API_KEY");
  const impSecret = requireEnv("PORTONE_API_SECRET");
  const parsed = await fetchAndParseIamportCertification(impUid, impKey, impSecret);
  const certPhone = String(parsed.phoneE164 || "").trim();
  if (!certPhone) {
    throw new AccountWithdrawalError("인증된 휴대폰 번호를 확인하지 못했습니다.", 400);
  }

  const replayHash = hashOpaqueToken(`withdraw-phone:${impUid}`);
  const replay = await prisma.passwordResetToken.findUnique({ where: { tokenHash: replayHash } });
  if (replay?.usedAt) {
    throw new AccountWithdrawalError("이미 사용된 본인인증입니다. 다시 인증해 주세요.", 400);
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, ciHash: true, phoneE164: true, status: true }
  });
  if (!me) throw new AccountWithdrawalError("로그인이 필요합니다.", 401);

  const ciPrisma = toPrismaBytes(hashCiUniqueKey(parsed.ciUniqueKey));
  if (!buffersEqual(me.ciHash as Uint8Array | null, ciPrisma)) {
    throw new AccountWithdrawalError(
      "본인인증 정보가 이 계정과 일치하지 않습니다. 가입 시 등록한 휴대폰으로 인증해 주세요.",
      403
    );
  }

  const registered = String(me.phoneE164 || "").trim();
  if (registered && registered !== certPhone) {
    throw new AccountWithdrawalError(
      "가입 시 등록한 휴대폰 번호와 일치하지 않습니다. 등록 이메일 인증 또는 탈퇴 신청을 이용해 주세요.",
      403
    );
  }

  await prisma.passwordResetToken.upsert({
    where: { tokenHash: replayHash },
    create: {
      tokenHash: replayHash,
      userId: me.id,
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    update: { usedAt: new Date() }
  });

  return { ok: true as const };
}

export async function getAccountWithdrawalStatus(userId: string) {
  await ensureWithdrawalDbReady();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      withdrawalScheduledAt: true,
      withdrawalRequestedAt: true,
      withdrawalMethod: true,
      phoneE164: true
    }
  });
  if (!user || user.status === "DELETED") {
    return { pending: false, scheduledAt: null, method: null, recoverableUntil: null };
  }
  if (!user.withdrawalScheduledAt) {
    return { pending: false, scheduledAt: null, method: null, recoverableUntil: null };
  }
  return {
    pending: true,
    scheduledAt: user.withdrawalScheduledAt.toISOString(),
    requestedAt: user.withdrawalRequestedAt?.toISOString() || null,
    method: user.withdrawalMethod || "manual",
    recoverableUntil: user.withdrawalScheduledAt.toISOString(),
    hasPhone: Boolean(user.phoneE164)
  };
}

export async function sendWithdrawalEmailCode(userId: string) {
  await ensureWithdrawalDbReady();
  await assertWithdrawalAllowed(userId);
  const email = await resolveUserNotifyEmail(userId, { deliverableOnly: true });
  if (!email) {
    throw new AccountWithdrawalError(
      "인증번호를 받을 수 있는 외부 이메일이 없습니다. 가입 휴대폰 PASS 인증 또는 탈퇴 신청을 이용해 주세요.",
      400,
      "NO_DELIVERABLE_EMAIL"
    );
  }
  const sent = await sendEmailAuthCode({ purpose: "account_withdraw", emailRaw: email });
  return {
    ok: true as const,
    maskedEmail: sent.maskedEmail,
    expiresInSec: sent.expiresInSec,
    ...(sent.devCode ? { devCode: sent.devCode } : {})
  };
}

export async function withdrawAccountWithEmailCode(userId: string, codeRaw: string) {
  await ensureWithdrawalDbReady();
  await assertWithdrawalAllowed(userId);
  const email = await resolveUserNotifyEmail(userId, { deliverableOnly: true });
  if (!email) {
    throw new AccountWithdrawalError(
      "인증번호를 받을 수 있는 외부 이메일이 없습니다.",
      400,
      "NO_DELIVERABLE_EMAIL"
    );
  }
  await verifyEmailAuthCode({ purpose: "account_withdraw", emailRaw: email, codeRaw });
  await dissolveFamilyLinksForGuardianWithdrawal(userId);
  await withdrawUserAccount(userId);
  return { ok: true as const, immediate: true as const };
}

export async function withdrawAccountWithPhone(userId: string, impUid: string) {
  await ensureWithdrawalDbReady();
  await assertWithdrawalAllowed(userId);
  await verifyPassMatchesAccount(userId, impUid);
  await dissolveFamilyLinksForGuardianWithdrawal(userId);
  await withdrawUserAccount(userId);
  return { ok: true as const, immediate: true as const };
}

export async function applyManualWithdrawal(
  userId: string,
  input: {
    loginId?: string;
    password?: string;
    phone?: string;
    email?: string;
    address?: string;
  }
) {
  await ensureWithdrawalDbReady();
  await assertWithdrawalAllowed(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      publicHandle: true,
      passwordHash: true,
      phoneE164: true
    }
  });
  if (!user?.passwordHash) {
    throw new AccountWithdrawalError("비밀번호 로그인 계정만 탈퇴 신청할 수 있습니다.", 400);
  }

  const loginId = String(input.loginId || "").trim().toLowerCase();
  const password = String(input.password || "");
  const phoneInput = normalizeToE164KR(String(input.phone || ""));
  const emailInput = String(input.email || "").trim().toLowerCase();
  const addressInput = normalizeAddress(String(input.address || ""));

  if (!loginId || !password || !phoneInput || !emailInput || !addressInput) {
    throw new AccountWithdrawalError("모든 항목을 입력해 주세요.", 400);
  }

  if (loginId !== String(user.publicHandle || "").trim().toLowerCase()) {
    throw new AccountWithdrawalError("아이디가 일치하지 않습니다.", 403);
  }

  const pwOk = await verifyPassword(password, user.passwordHash);
  if (!pwOk) throw new AccountWithdrawalError("비밀번호가 일치하지 않습니다.", 403);

  const registeredPhone = String(user.phoneE164 || "").trim();
  if (!registeredPhone || registeredPhone !== phoneInput) {
    throw new AccountWithdrawalError("등록했던 휴대폰 번호가 일치하지 않습니다.", 403);
  }

  const emails = await userRegisteredEmails(userId);
  if (!emails.has(emailInput)) {
    throw new AccountWithdrawalError("등록했던 이메일이 일치하지 않습니다.", 403);
  }

  const storedAddress = await readStoredAddress(userId);
  if (storedAddress && storedAddress !== addressInput) {
    throw new AccountWithdrawalError("등록 시 입력된 주소가 일치하지 않습니다.", 403);
  }

  const now = new Date();
  const scheduledAt = new Date(now.getTime() + WITHDRAWAL_GRACE_MS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      withdrawalRequestedAt: now,
      withdrawalScheduledAt: scheduledAt,
      withdrawalMethod: "manual"
    }
  });

  return {
    ok: true as const,
    immediate: false as const,
    scheduledAt: scheduledAt.toISOString(),
    recoverableUntil: scheduledAt.toISOString()
  };
}

export async function cancelScheduledWithdrawal(userId: string) {
  await ensureWithdrawalDbReady();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, withdrawalScheduledAt: true }
  });
  if (!user || user.status === "DELETED") {
    throw new AccountWithdrawalError("탈퇴 예약을 찾을 수 없습니다.", 404);
  }
  if (!user.withdrawalScheduledAt) {
    throw new AccountWithdrawalError("진행 중인 탈퇴 예약이 없습니다.", 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      withdrawalScheduledAt: null,
      withdrawalRequestedAt: null,
      withdrawalMethod: null
    }
  });

  return { ok: true as const };
}

export async function processDueScheduledWithdrawals(limit = 50) {
  if (!(await ensureWithdrawalScheduleSchema())) return { processed: 0, scanned: 0 };
  const now = new Date();
  const due = await prisma.user.findMany({
    where: {
      status: { not: "DELETED" },
      withdrawalScheduledAt: { lte: now }
    },
    select: { id: true },
    take: limit
  });

  let processed = 0;
  for (const row of due) {
    try {
      await dissolveFamilyLinksForGuardianWithdrawal(row.id);
      await withdrawUserAccount(row.id);
      processed += 1;
    } catch (e) {
      console.warn("[withdrawal-cron] failed", row.id, e);
    }
  }
  return { processed, scanned: due.length };
}
