import { createHash, randomInt } from "node:crypto";
import { prisma } from "../../db/client.js";
import { verifyPassword } from "../../lib/passwordHash.js";
import { assertBusinessEmailEligible } from "../email/emailDomainClassification.js";
import { isStandalonePersonalAccount } from "../membership/personalComboPricing.js";
import { attachEnterpriseReferralAttribution } from "../membership/enterpriseReferralAttribution.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const REVVERIFY_MIN_DAYS = 30;
const REVVERIFY_MAX_DAYS = 90;

function hashOtp(email: string, otp: string): string {
  return createHash("sha256").update(`${email.toLowerCase()}:${otp}`, "utf8").digest("hex");
}

function normalizeCompanyName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function randomReverifyDays(): number {
  return randomInt(REVVERIFY_MIN_DAYS, REVVERIFY_MAX_DAYS + 1);
}

async function assertStandalonePersonalUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { enterpriseRole: true, enterpriseGroupId: true, isEnterpriseVerified: true }
  });
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");
  if (!isStandalonePersonalAccount(user)) {
    throw new Error("회사 회선 계정에서는 개인 콤보 인증을 사용할 수 없습니다. 개인 휴대폰으로 별도 가입해 주세요.");
  }
  return user;
}

export type VerifyCorporateCredentialsInput = {
  userId: string;
  companyName: string;
  assigneeName: string;
  companyLoginId: string;
  password: string;
};

/**
 * 회사명·담당자명·회사 아이디·비밀번호로 재직 확인
 * — 기업 User 와 FK 연동 없이 isEnterpriseVerified 플래그만 설정
 */
export async function verifyCorporateCredentials(input: VerifyCorporateCredentialsInput) {
  await assertStandalonePersonalUser(input.userId);

  const loginId = String(input.companyLoginId || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  const companyName = normalizeCompanyName(String(input.companyName || ""));
  const assigneeName = normalizePersonName(String(input.assigneeName || ""));
  const password = String(input.password || "");

  if (!loginId || !companyName || !assigneeName || !password) {
    throw new Error("회사명, 담당자 이름, 회사 아이디, 비밀번호를 모두 입력해 주세요.");
  }

  const entUser = await prisma.user.findFirst({
    where: { publicHandle: loginId },
    select: { id: true, passwordHash: true, enterpriseRole: true, enterpriseGroupId: true }
  });
  if (!entUser?.passwordHash) {
    throw new Error("회사 계정 정보가 일치하지 않습니다.");
  }
  if (entUser.enterpriseRole === "NONE" && !entUser.enterpriseGroupId) {
    throw new Error("기업 회선 계정이 아닙니다.");
  }

  const pwOk = await verifyPassword(password, entUser.passwordHash);
  if (!pwOk) {
    throw new Error("회사 계정 정보가 일치하지 않습니다.");
  }

  const cred = await prisma.enterpriseMemberCredential.findFirst({
    where: { userId: entUser.id },
    include: { enterprise: { select: { id: true, companyName: true, status: true } } },
    orderBy: { createdAt: "desc" }
  });
  if (!cred) {
    throw new Error("등록된 기업 회원 정보를 찾을 수 없습니다.");
  }
  if (normalizeCompanyName(cred.enterprise.companyName) !== companyName) {
    throw new Error("회사명이 일치하지 않습니다.");
  }
  if (normalizePersonName(cred.assigneeName) !== assigneeName) {
    throw new Error("담당자 이름이 일치하지 않습니다.");
  }
  if (cred.enterprise.status !== "active") {
    throw new Error("활성화된 기업 계정이 아닙니다.");
  }

  const now = new Date();
  const nextCheck = new Date(now);
  nextCheck.setDate(nextCheck.getDate() + randomReverifyDays());

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      isEnterpriseVerified: true,
      enterpriseVerifiedAt: now,
      enterpriseVerifyNextCheckAt: nextCheck
    }
  });

  const enterpriseReferral = await attachEnterpriseReferralAttribution(
    input.userId,
    cred.enterprise.id
  );

  return {
    ok: true as const,
    isEnterpriseVerified: true,
    enterpriseVerifiedAt: now.toISOString(),
    nextReverifyAt: nextCheck.toISOString(),
    enterpriseReferral
  };
}

export async function sendCorporateMailOtp(userId: string, emailRaw: string) {
  await assertStandalonePersonalUser(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isEnterpriseVerified: true }
  });
  if (!user?.isEnterpriseVerified) {
    throw new Error("회사 계정 인증(회사명·아이디·비밀번호)을 먼저 완료해 주세요.");
  }

  const email = assertBusinessEmailEligible(emailRaw);

  const recent = await prisma.personalEnterpriseMailOtp.findFirst({
    where: { userId, email },
    orderBy: { createdAt: "desc" }
  });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_COOLDOWN_MS) {
    throw new Error("잠시 후 다시 요청해 주세요.");
  }

  const otp = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.personalEnterpriseMailOtp.create({
    data: {
      userId,
      email,
      otpHash: hashOtp(email, otp),
      expiresAt
    }
  });

  await dispatchCorporateMailOtp(email, otp);

  const exposeDev =
    process.env.NODE_ENV !== "production" || process.env.VLUE_DEV_EXPOSE_MAIL_OTP === "1";

  return {
    ok: true as const,
    email,
    expiresAt: expiresAt.toISOString(),
    ...(exposeDev ? { devOtp: otp } : {})
  };
}

export async function verifyCorporateMailOtp(userId: string, emailRaw: string, otpRaw: string) {
  await assertStandalonePersonalUser(userId);

  const email = assertBusinessEmailEligible(emailRaw);
  const otp = String(otpRaw || "").trim();
  if (otp.length !== 6) {
    throw new Error("이메일과 6자리 인증번호를 입력해 주세요.");
  }

  const challenge = await prisma.personalEnterpriseMailOtp.findFirst({
    where: { userId, email, verifiedAt: null },
    orderBy: { createdAt: "desc" }
  });
  if (!challenge) {
    throw new Error("인증 요청 내역이 없습니다. 다시 발송해 주세요.");
  }
  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new Error("인증번호가 만료되었습니다. 다시 발송해 주세요.");
  }
  if (challenge.otpHash !== hashOtp(email, otp)) {
    throw new Error("인증번호가 일치하지 않습니다.");
  }

  const now = new Date();
  const nextCheck = new Date(now);
  nextCheck.setDate(nextCheck.getDate() + randomReverifyDays());

  await prisma.$transaction([
    prisma.personalEnterpriseMailOtp.update({
      where: { id: challenge.id },
      data: { verifiedAt: now }
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        isEnterpriseVerified: true,
        enterpriseVerifiedAt: now,
        enterpriseVerifiedEmail: email,
        enterpriseVerifyNextCheckAt: nextCheck
      }
    })
  ]);

  return {
    ok: true as const,
    isEnterpriseVerified: true,
    enterpriseVerifiedEmail: email,
    nextReverifyAt: nextCheck.toISOString()
  };
}

/** 회사 메일 OTP 발송 — SMTP 연동 전 콘솔·웹훅 스텁 */
async function dispatchCorporateMailOtp(email: string, otp: string) {
  const webhook = process.env.VLUE_CORP_MAIL_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, purpose: "personal_combo_verify" })
      });
      return;
    } catch (e) {
      console.warn("[corporateMail] webhook failed", e);
    }
  }
  console.info(`[corporateMail] OTP to ${email}: ${otp}`);
}

/**
 * 퇴사자 검출용 — 회사 메일 수신 가능 여부 재확인 (스케줄러)
 * 실패 시 false — 개인 데이터는 유지, 콤보 혜택만 회수
 */
export async function probeCorporateEmailDeliverability(email: string): Promise<boolean> {
  const mode = process.env.VLUE_CORP_MAIL_PROBE_MODE || "stub";
  if (mode === "always_fail") return false;
  if (mode === "always_pass") return true;

  const otp = String(randomInt(100000, 999999));
  await dispatchCorporateMailOtp(email, otp);

  const webhook = process.env.VLUE_CORP_MAIL_PROBE_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "probe_deliverability" })
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { deliverable?: boolean };
        return Boolean(data.deliverable);
      }
    } catch (e) {
      console.warn("[corporateMail] probe webhook failed", e);
    }
  }

  return true;
}
