import { randomBytes, randomInt } from "node:crypto";
import { isRealSmtpDeliveryConfigured, resolveSmtpProvider } from "../adapters/smtpProvider.js";
import { isValidEmailShape, normalizeBusinessEmail } from "./signupEmailProvision.js";

type OtpEntry = { code: string; expiresAt: number };
type TokenEntry = { email: string; expiresAt: number };

const otpStore = new Map<string, OtpEntry>();
const tokenStore = new Map<string, TokenEntry>();

const OTP_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 30 * 60 * 1000;

function randomOtpCode(): string {
  return String(randomInt(100000, 999999));
}

function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of otpStore) {
    if (v.expiresAt < now) otpStore.delete(k);
  }
  for (const [k, v] of tokenStore) {
    if (v.expiresAt < now) tokenStore.delete(k);
  }
}

export async function sendSignupEmailOtp(emailRaw: string): Promise<{ ok: true; devCode?: string }> {
  purgeExpired();
  const email = normalizeBusinessEmail(emailRaw);
  if (!isValidEmailShape(email)) {
    throw new Error("유효한 이메일 주소를 입력해 주세요.");
  }

  const code =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_IDENTITY === "1"
      ? "000000"
      : randomOtpCode();

  otpStore.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS });

  const prodMail =
    process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_IDENTITY !== "1";

  if (prodMail) {
    /**
     * Railway 기본값 SMTP_PROVIDER=mock 이면 콘솔만 찍고 성공 응답 → 수신함에 메일이 안 옴.
     * 가짜 성공을 막고 Resend 설정을 요구한다.
     */
    if (!isRealSmtpDeliveryConfigured()) {
      throw new Error(
        "이메일 발송이 아직 설정되지 않았습니다. 「개인 아이디로 가입」으로 진행하거나, 관리자에게 SMTP(Resend) 설정을 요청해 주세요."
      );
    }
    const smtp = resolveSmtpProvider();
    await smtp.send({
      from: process.env.VLUE_SIGNUP_FROM_EMAIL || "noreply@vlue.kr",
      to: email,
      subject: "[VLUE] 이메일 인증번호",
      text: `VLUE 가입 이메일 인증번호: ${code}\n10분 내에 입력해 주세요.`
    });
    return { ok: true };
  }

  return { ok: true, devCode: code };
}

export function verifySignupEmailOtp(emailRaw: string, codeRaw: string): string {
  purgeExpired();
  const email = normalizeBusinessEmail(emailRaw);
  const code = String(codeRaw || "").trim();
  if (!isValidEmailShape(email) || !code) {
    throw new Error("이메일과 인증번호를 입력해 주세요.");
  }

  const entry = otpStore.get(email);
  const devBypass =
    (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_IDENTITY === "1") &&
    code === "000000";

  if (!devBypass && (!entry || entry.code !== code || entry.expiresAt < Date.now())) {
    throw new Error("인증번호가 올바르지 않거나 만료되었습니다.");
  }

  const token = randomBytes(24).toString("hex");
  tokenStore.set(token, { email, expiresAt: Date.now() + TOKEN_TTL_MS });
  otpStore.delete(email);
  return token;
}

export function consumeSignupEmailToken(emailRaw: string, tokenRaw: string | null | undefined) {
  purgeExpired();
  const email = normalizeBusinessEmail(emailRaw);
  const token = String(tokenRaw || "").trim();
  if (!token) {
    throw new Error("이메일 인증을 완료해 주세요.");
  }
  const entry = tokenStore.get(token);
  if (!entry || entry.email !== email || entry.expiresAt < Date.now()) {
    throw new Error("이메일 인증이 만료되었습니다. 다시 인증해 주세요.");
  }
  tokenStore.delete(token);
}
