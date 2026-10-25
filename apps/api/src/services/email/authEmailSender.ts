import { isRealSmtpDeliveryConfigured, resolveSmtpProvider } from "../adapters/smtpProvider.js";
import { isSesConfigured, sendEmailViaSes, type SesSendInput } from "../mailTalk/sesMailSender.js";

export function isSesIdentityVerificationError(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || "").toLowerCase();
  return (
    msg.includes("email address is not verified") ||
    msg.includes("identities failed the check") ||
    msg.includes("messagerejected")
  );
}

/** AWS IAM 키 만료·폐기·오타 — InvalidClientTokenId / SignatureDoesNotMatch 등 */
export function isSesCredentialError(err: unknown): boolean {
  const name = String((err as { name?: string })?.name || "").toLowerCase();
  const msg = String((err as Error)?.message || err || "").toLowerCase();
  return (
    name === "invalidclienttokenid" ||
    name === "unrecognizedclientexception" ||
    name === "signaturedoesnotmatch" ||
    name === "expiredtoken" ||
    name === "invalidtoken" ||
    msg.includes("security token included in the request is invalid") ||
    msg.includes("the security token included in the request is expired") ||
    msg.includes("the request signature we calculated does not match") ||
    msg.includes("unable to locate credentials")
  );
}

function isResendAuthError(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || "").toLowerCase();
  return (
    msg.includes("resend") ||
    msg.includes("api key is invalid") ||
    msg.includes("invalid api key") ||
    msg.includes("unauthorized") ||
    msg.includes("missing_api_key")
  );
}

export function mapAuthEmailSendError(err: unknown): Error {
  if (isSesCredentialError(err)) {
    return new Error(
      "이메일 발송 설정이 올바르지 않습니다. 잠시 후 다시 시도하거나 고객센터 support@vlue.kr 로 문의해 주세요."
    );
  }
  if (isSesIdentityVerificationError(err) || isResendAuthError(err)) {
    return new Error(
      "이메일 발송 서비스 설정이 완료되지 않았습니다. 잠시 후 다시 시도하거나 고객센터 support@vlue.kr 로 문의해 주세요."
    );
  }
  const msg = err instanceof Error ? err.message : String(err || "unknown error");
  return new Error(msg);
}

function authFromEmail(): string {
  const raw = String(
    process.env.VLUE_SIGNUP_FROM_EMAIL || process.env.SENDER_EMAIL || "support@vlue.kr"
  ).trim();
  return raw || "support@vlue.kr";
}

function formatFromForSmtp(from: string): string {
  if (from.includes("<")) return from;
  return `VLUE <${from}>`;
}

function allowSesFallback(): boolean {
  return (
    process.env.AUTH_EMAIL_ALLOW_SES_FALLBACK === "1" ||
    String(process.env.AUTH_EMAIL_ALLOW_SES_FALLBACK || "").toLowerCase() === "true"
  );
}

export function isAuthEmailDeliveryConfigured(): boolean {
  // 운영 OTP는 Resend 고정. SES는 명시적 폴백만.
  if (isRealSmtpDeliveryConfigured()) return true;
  return allowSesFallback() && isSesConfigured();
}

/**
 * 가입·탈퇴·비밀번호 등 인증번호 메일.
 * 기본: Resend 전용. SES는 AUTH_EMAIL_ALLOW_SES_FALLBACK=1 일 때만 폴백.
 */
export async function sendAuthEmail(input: Omit<SesSendInput, "from"> & { from?: string }) {
  const fromPlain = input.from || authFromEmail();
  const fromSmtp = formatFromForSmtp(fromPlain);
  const sesPayload: SesSendInput = {
    from: fromPlain,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo
  };

  if (isRealSmtpDeliveryConfigured()) {
    try {
      const smtp = resolveSmtpProvider();
      return await smtp.send({
        from: fromSmtp,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo
      });
    } catch (resendErr) {
      if (allowSesFallback() && isSesConfigured()) {
        try {
          return await sendEmailViaSes(sesPayload);
        } catch {
          throw mapAuthEmailSendError(resendErr);
        }
      }
      throw mapAuthEmailSendError(resendErr);
    }
  }

  if (allowSesFallback() && isSesConfigured()) {
    try {
      return await sendEmailViaSes(sesPayload);
    } catch (err) {
      throw mapAuthEmailSendError(err);
    }
  }

  throw new Error(
    "이메일 발송이 아직 설정되지 않았습니다. 고객센터 support@vlue.kr 로 문의해 주세요."
  );
}
