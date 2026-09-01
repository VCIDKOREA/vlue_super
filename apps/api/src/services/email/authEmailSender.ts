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

export function mapAuthEmailSendError(err: unknown): Error {
  if (isSesIdentityVerificationError(err)) {
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

export function isAuthEmailDeliveryConfigured(): boolean {
  return isRealSmtpDeliveryConfigured() || isSesConfigured();
}

/** 가입·탈퇴·비밀번호 등 인증번호 메일 — Resend 우선, SES 폴백 */
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
      if (!isSesConfigured()) throw mapAuthEmailSendError(resendErr);
      try {
        return await sendEmailViaSes(sesPayload);
      } catch {
        throw mapAuthEmailSendError(resendErr);
      }
    }
  }

  if (isSesConfigured()) {
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
