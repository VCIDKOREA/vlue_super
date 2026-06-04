import { timingSafeEqual } from "node:crypto";

export type OpenBankingWebhookAuthResult =
  | { ok: true }
  | { ok: false; status: 401; code: string; error: string };

/**
 * `OPENBANKING_WEBHOOK_SECRET` 환경 변수와
 * `X-OpenBanking-Webhook-Secret` 헤더를 timing-safe 비교.
 */
export function verifyOpenBankingWebhookSecret(
  headerValue: string | undefined | null
): OpenBankingWebhookAuthResult {
  const expected = String(process.env.OPENBANKING_WEBHOOK_SECRET || "").trim();
  const provided = String(headerValue || "").trim();

  if (!expected) {
    return {
      ok: false,
      status: 401,
      code: "OPENBANKING_SECRET_NOT_CONFIGURED",
      error:
        "OPENBANKING_WEBHOOK_SECRET 환경 변수가 설정되지 않았습니다. API 서버 .env 에 시크릿을 추가해 주세요."
    };
  }

  if (!provided) {
    return {
      ok: false,
      status: 401,
      code: "OPENBANKING_SECRET_MISSING",
      error: "X-OpenBanking-Webhook-Secret 헤더가 필요합니다."
    };
  }

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return {
      ok: false,
      status: 401,
      code: "OPENBANKING_SECRET_MISMATCH",
      error: "Unauthorized"
    };
  }

  return { ok: true };
}
