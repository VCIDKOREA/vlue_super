import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "../../db/client.js";
import { kvDel, kvGet, kvSetEx } from "../../lib/redisKv.js";
import { sendEmailViaSesOrMock } from "../mailTalk/sesMailSender.js";
import { isAuthEmailDeliveryConfigured, sendAuthEmail } from "./authEmailSender.js";
import { listMasterTargets } from "./userEmailMappingsStore.js";
import { isValidEmailShape, normalizeBusinessEmail } from "./signupEmailProvision.js";

export const EMAIL_OTP_TTL_SEC = 5 * 60;
export const EMAIL_VERIFIED_TTL_SEC = 10 * 60;
export const EMAIL_AUTH_SUPPORT = "이메일이 기억나지 않으면 고객센터 support@vlue.kr 로 문의해 주세요.";
export const SENDER_EMAIL_DEFAULT = "support@vlue.kr";

export const EMAIL_AUTH_PURPOSES = [
  "signup",
  "login_device",
  "password_change",
  "find_id",
  "dcc_email",
  "account_withdraw",
  "corp_combo",
  "enterprise_dcc_party"
] as const;
export type EmailAuthPurpose = (typeof EMAIL_AUTH_PURPOSES)[number];

export function isEmailAuthPurpose(v: string): v is EmailAuthPurpose {
  return (EMAIL_AUTH_PURPOSES as readonly string[]).includes(v);
}

function senderEmail(): string {
  return String(process.env.SENDER_EMAIL || SENDER_EMAIL_DEFAULT).trim() || SENDER_EMAIL_DEFAULT;
}

function allowDevOtp(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_IDENTITY === "1";
}

function randomOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export function maskEmail(emailRaw: string): string {
  const email = String(emailRaw || "").trim().toLowerCase();
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const keep = local.slice(0, local.length <= 2 ? 1 : 2);
  return `${keep}***@${domain}`;
}

export function normalizeAuthEmail(emailRaw: string): string {
  return normalizeBusinessEmail(emailRaw);
}

function otpKey(purpose: EmailAuthPurpose, email: string): string {
  return `vlue:email-otp:${purpose}:${email}`;
}

function rateKey(purpose: EmailAuthPurpose, email: string): string {
  return `vlue:email-otp-rate:${purpose}:${email}`;
}

function verifiedKey(token: string): string {
  return `vlue:email-verified:${token}`;
}

function loginGateKey(ticket: string): string {
  return `vlue:login-gate:${ticket}`;
}

export type LoginGatePayload = {
  userId: string;
  loginId: string;
  deviceToken: string;
};

export async function putLoginGateTicket(payload: LoginGatePayload): Promise<string> {
  const ticket = randomBytes(24).toString("hex");
  await kvSetEx(loginGateKey(ticket), JSON.stringify(payload), EMAIL_OTP_TTL_SEC);
  return ticket;
}

export async function readLoginGateTicket(ticketRaw: string): Promise<LoginGatePayload | null> {
  const ticket = String(ticketRaw || "").trim();
  if (!ticket) return null;
  const raw = await kvGet(loginGateKey(ticket));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LoginGatePayload;
    if (!parsed?.userId || !parsed?.deviceToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function dropLoginGateTicket(ticketRaw: string): Promise<void> {
  await kvDel(loginGateKey(String(ticketRaw || "").trim()));
}

export type PasswordGatePayload = {
  userId: string;
  email: string;
};

export async function putPasswordGateTicket(payload: PasswordGatePayload): Promise<string> {
  const ticket = randomBytes(24).toString("hex");
  await kvSetEx(`vlue:pw-gate:${ticket}`, JSON.stringify(payload), EMAIL_OTP_TTL_SEC);
  return ticket;
}

export async function readPasswordGateTicket(ticketRaw: string): Promise<PasswordGatePayload | null> {
  const ticket = String(ticketRaw || "").trim();
  if (!ticket) return null;
  const raw = await kvGet(`vlue:pw-gate:${ticket}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PasswordGatePayload;
    if (!parsed?.userId || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type VerifiedEmailTicket = {
  purpose: EmailAuthPurpose;
  email: string;
  userId?: string;
};

export async function issueVerifiedEmailTicket(payload: VerifiedEmailTicket): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await kvSetEx(verifiedKey(token), JSON.stringify(payload), EMAIL_VERIFIED_TTL_SEC);
  return token;
}

export async function consumeVerifiedEmailTicket(
  tokenRaw: string,
  expected: { purpose: EmailAuthPurpose; email?: string; userId?: string }
): Promise<VerifiedEmailTicket> {
  const token = String(tokenRaw || "").trim();
  if (!token) {
    throw new Error("이메일 인증을 완료해 주세요.");
  }
  const raw = await kvGet(verifiedKey(token));
  if (!raw) {
    throw new Error("이메일 인증이 만료되었습니다. 다시 인증해 주세요.");
  }
  let parsed: VerifiedEmailTicket;
  try {
    parsed = JSON.parse(raw) as VerifiedEmailTicket;
  } catch {
    throw new Error("이메일 인증이 만료되었습니다. 다시 인증해 주세요.");
  }
  if (parsed.purpose !== expected.purpose) {
    throw new Error("이메일 인증이 올바르지 않습니다.");
  }
  if (expected.email && parsed.email !== normalizeAuthEmail(expected.email)) {
    throw new Error("인증한 이메일과 일치하지 않습니다.");
  }
  if (expected.userId && parsed.userId && parsed.userId !== expected.userId) {
    throw new Error("이메일 인증이 올바르지 않습니다.");
  }
  await kvDel(verifiedKey(token));
  return parsed;
}

export async function resolveUserNotifyEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });
  const direct = String(user?.email || "").trim().toLowerCase();
  if (direct && isValidEmailShape(direct) && !direct.endsWith("@vlue.kr")) {
    return direct;
  }
  try {
    const masters = await listMasterTargets(userId);
    const primary = masters.find((m) => m.is_primary)?.email || masters[0]?.email;
    if (primary && isValidEmailShape(primary)) return String(primary).trim().toLowerCase();
  } catch {
    /* ignore */
  }
  if (direct && isValidEmailShape(direct)) return direct;
  return null;
}

function otpHtml(code: string): { subject: string; text: string; html: string } {
  const subject = "[VLUE] 이메일 인증번호";
  const text = [
    `VLUE 인증번호는 ${code} 입니다.`,
    "5분 이내에 입력해 주세요.",
    "",
    EMAIL_AUTH_SUPPORT
  ].join("\n");
  const html = `<!DOCTYPE html><html lang="ko"><body style="font-family:sans-serif;line-height:1.6;color:#191f28">
<p>VLUE 인증번호는 <strong style="font-size:22px;letter-spacing:4px">${code}</strong> 입니다.</p>
<p>5분 이내에 입력해 주세요.</p>
<p style="color:#8b95a1;font-size:13px">${EMAIL_AUTH_SUPPORT}</p>
</body></html>`;
  return { subject, text, html };
}

export async function sendEmailAuthCode(opts: {
  purpose: EmailAuthPurpose;
  emailRaw: string;
}): Promise<{ ok: true; expiresInSec: number; maskedEmail: string; devCode?: string }> {
  const email = normalizeAuthEmail(opts.emailRaw);
  if (!isValidEmailShape(email)) {
    throw new Error("유효한 이메일 주소를 입력해 주세요.");
  }

  const last = await kvGet(rateKey(opts.purpose, email));
  if (last) {
    throw new Error("인증번호를 이미 보냈습니다. 잠시 후 다시 시도해 주세요.");
  }

  const code = allowDevOtp() ? "000000" : randomOtpCode();
  await kvSetEx(otpKey(opts.purpose, email), code, EMAIL_OTP_TTL_SEC);
  await kvSetEx(rateKey(opts.purpose, email), "1", 45);

  const { subject, text, html } = otpHtml(code);
  const from = senderEmail();

  if (isAuthEmailDeliveryConfigured()) {
    await sendAuthEmail({ from, to: email, subject, html, text });
  } else if (!allowDevOtp()) {
    throw new Error(
      "이메일 발송이 아직 설정되지 않았습니다. 고객센터 support@vlue.kr 로 문의해 주세요."
    );
  } else {
    await sendEmailViaSesOrMock({ from, to: email, subject, html, text });
  }

  return {
    ok: true,
    expiresInSec: EMAIL_OTP_TTL_SEC,
    maskedEmail: maskEmail(email),
    ...(allowDevOtp() ? { devCode: code } : {})
  };
}

export async function verifyEmailAuthCode(opts: {
  purpose: EmailAuthPurpose;
  emailRaw: string;
  codeRaw: string;
}): Promise<string> {
  const email = normalizeAuthEmail(opts.emailRaw);
  const code = String(opts.codeRaw || "").trim();
  if (!isValidEmailShape(email) || !code) {
    throw new Error("이메일과 인증번호를 입력해 주세요.");
  }

  const stored = await kvGet(otpKey(opts.purpose, email));
  const devBypass = allowDevOtp() && code === "000000";
  if (!devBypass && (!stored || stored !== code)) {
    throw new Error("인증번호가 올바르지 않거나 만료되었습니다.");
  }
  await kvDel(otpKey(opts.purpose, email));
  return email;
}
