import { randomBytes } from "node:crypto";
import { normalizeBusinessEmail } from "./signupEmailProvision.js";
import { sendEmailAuthCode, verifyEmailAuthCode } from "./emailAuthCodeService.js";
import { kvDel, kvGet, kvSetEx } from "../../lib/redisKv.js";

const TOKEN_TTL_SEC = 30 * 60;

function signupTokenKey(token: string): string {
  return `vlue:signup-email-token:${token}`;
}

export async function sendSignupEmailOtp(emailRaw: string): Promise<{ ok: true; devCode?: string }> {
  const result = await sendEmailAuthCode({ purpose: "signup", emailRaw });
  return result.devCode ? { ok: true, devCode: result.devCode } : { ok: true };
}

export async function verifySignupEmailOtp(emailRaw: string, codeRaw: string): Promise<string> {
  const email = await verifyEmailAuthCode({ purpose: "signup", emailRaw, codeRaw });
  const token = randomBytes(24).toString("hex");
  await kvSetEx(signupTokenKey(token), email, TOKEN_TTL_SEC);
  return token;
}

export async function consumeSignupEmailToken(emailRaw: string, tokenRaw: string | null | undefined) {
  const email = normalizeBusinessEmail(emailRaw);
  const token = String(tokenRaw || "").trim();
  if (!token) {
    throw new Error("이메일 인증을 완료해 주세요.");
  }
  const stored = await kvGet(signupTokenKey(token));
  if (!stored || stored !== email) {
    throw new Error("이메일 인증이 만료되었습니다. 다시 인증해 주세요.");
  }
  await kvDel(signupTokenKey(token));
}
